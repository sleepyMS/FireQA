import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createSSEStream } from "@/lib/sse/create-sse-stream";
import { Stage } from "@/types/sse";
import type { AgentOutputChunk } from "@/types/agent";
import {
  withApiHandler,
  ApiError,
  postAgentOutputSchema,
  type PostAgentOutputBody,
} from "@/lib/api";

// POST — agent가 로그 청크 전송
export const POST = withApiHandler<PostAgentOutputBody>(
  async ({ user, body, params }) => {
    const { id } = params;
    const chunks = body.chunks as AgentOutputChunk[];

    const task = await prisma.agentTask.findUnique({
      where: { id },
      select: { id: true, organizationId: true, outputLog: true },
    });
    if (!task || task.organizationId !== user.organizationId) {
      throw ApiError.notFound("작업");
    }

    // 기존 로그에 append
    const existingLog: AgentOutputChunk[] = task.outputLog
      ? JSON.parse(task.outputLog)
      : [];
    const updatedLog = [...existingLog, ...chunks];

    // 10MB 제한: 초과 시 최근 100개 로그만 유지
    const MAX_LOG_SIZE = 10 * 1024 * 1024;
    const logStr = JSON.stringify(updatedLog);
    let finalLog: string;
    let finalChunkCount: number;

    if (logStr.length > MAX_LOG_SIZE) {
      const trimmed = updatedLog.slice(-100);
      finalLog = JSON.stringify(trimmed);
      finalChunkCount = trimmed.length;
    } else {
      finalLog = logStr;
      finalChunkCount = updatedLog.length;
    }

    await prisma.agentTask.update({
      where: { id },
      data: { outputLog: finalLog, outputChunkCount: finalChunkCount },
    });

    return { received: chunks.length };
  },
  { bodySchema: postAgentOutputSchema },
);

// GET — 브라우저에서 SSE로 실시간 로그 구독
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const task = await prisma.agentTask.findUnique({
    where: { id },
    select: { id: true, organizationId: true, outputLog: true, status: true },
  });
  if (!task || task.organizationId !== user.organizationId) {
    return NextResponse.json(
      { error: "작업을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const TERMINAL_STATUSES = ["completed", "failed", "cancelled", "timed_out"];

  return createSSEStream(async (writer) => {
    let lastChunkCount = 0;

    // 기존 로그 즉시 전송
    if (task.outputLog) {
      const existing = JSON.parse(task.outputLog) as AgentOutputChunk[];
      for (const chunk of existing) {
        writer.send({
          type: "stage",
          stage: Stage.GENERATING,
          message: chunk.content,
          progress: 0,
          chunkType: chunk.type,
          tool: chunk.tool,
        });
      }
      lastChunkCount = existing.length;
    }

    // 이미 종료 상태면 complete 이벤트 전송 후 즉시 닫기
    if (TERMINAL_STATUSES.includes(task.status)) {
      writer.send({ type: "complete", data: null, tokenUsage: 0 });
      writer.close();
      return;
    }

    // 적응형 폴링: 새 데이터가 있으면 빠르게, 없으면 점차 느리게
    const POLL_FAST = 1_000;   // 활성 시 1초
    const POLL_SLOW = 5_000;   // 유휴 시 5초
    const IDLE_THRESHOLD = 3;  // 3회 연속 변화 없으면 유휴 전환
    let idleCount = 0;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    async function pollOnce() {
      if (writer.closed) return;

      try {
        // 경량 조회: count + status만 가져옴
        const current = await prisma.agentTask.findUnique({
          where: { id },
          select: { outputChunkCount: true, status: true },
        });

        if (!current) {
          writer.close();
          return;
        }

        // count가 변경된 경우에만 전체 로그 조회
        if (current.outputChunkCount > lastChunkCount) {
          const full = await prisma.agentTask.findUnique({
            where: { id },
            select: { outputLog: true },
          });

          const chunks: AgentOutputChunk[] = full?.outputLog
            ? JSON.parse(full.outputLog)
            : [];

          // 새 청크만 전송
          for (let i = lastChunkCount; i < chunks.length; i++) {
            writer.send({
              type: "stage",
              stage: Stage.GENERATING,
              message: chunks[i].content,
              progress: 0,
              chunkType: chunks[i].type,
              tool: chunks[i].tool,
            });
          }
          lastChunkCount = chunks.length;
          idleCount = 0; // 새 데이터 → 활성 상태 복귀
        } else {
          idleCount++;
        }

        // 종료 상태면 스트림 닫기
        if (TERMINAL_STATUSES.includes(current.status)) {
          writer.send({ type: "complete", data: null, tokenUsage: 0 });
          writer.close();
          return;
        }
      } catch {
        // polling 에러는 무시 — 다음 interval에서 재시도
      }

      // 다음 폴링 예약 (적응형 간격)
      if (!writer.closed) {
        const delay = idleCount >= IDLE_THRESHOLD ? POLL_SLOW : POLL_FAST;
        pollTimer = setTimeout(pollOnce, delay);
      }
    }

    // 첫 폴링 시작
    pollTimer = setTimeout(pollOnce, POLL_FAST);

    // 클라이언트 연결 끊김 시 정리
    request.signal.addEventListener("abort", () => {
      if (pollTimer) clearTimeout(pollTimer);
    });

    // 스트림이 닫힐 때까지 대기
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (writer.closed) {
          clearInterval(check);
          if (pollTimer) clearTimeout(pollTimer);
          resolve();
        }
      }, 500);
    });
  }, request.signal);
}
