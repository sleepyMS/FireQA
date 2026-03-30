import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createSSEStream } from "@/lib/sse/create-sse-stream";
import { Stage } from "@/types/sse";
import type { AgentOutputChunk } from "@/types/agent";

// POST — agent가 로그 청크 전송
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { chunks } = body as { chunks: AgentOutputChunk[] };

    if (!Array.isArray(chunks) || chunks.length === 0) {
      return NextResponse.json(
        { error: "chunks 배열이 필요합니다." },
        { status: 400 }
      );
    }

    const task = await prisma.agentTask.findUnique({ where: { id } });
    if (!task || task.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: "작업을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 기존 로그에 append
    const existingLog: AgentOutputChunk[] = task.outputLog
      ? JSON.parse(task.outputLog)
      : [];
    const updatedLog = [...existingLog, ...chunks];

    // 10MB 제한: 초과 시 최근 100개 로그만 유지
    const MAX_LOG_SIZE = 10 * 1024 * 1024;
    const logStr = JSON.stringify(updatedLog);
    const trimmedLog =
      logStr.length > MAX_LOG_SIZE
        ? JSON.stringify(updatedLog.slice(-100))
        : logStr;

    await prisma.agentTask.update({
      where: { id },
      data: { outputLog: trimmedLog },
    });

    return NextResponse.json({ received: chunks.length });
  } catch (error) {
    console.error("로그 전송 오류:", error);
    return NextResponse.json(
      { error: "로그 전송에 실패했습니다." },
      { status: 500 }
    );
  }
}

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
  const task = await prisma.agentTask.findUnique({ where: { id } });
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

    // 폴링으로 새 로그 감지 (1초 간격)
    const poll = setInterval(async () => {
      if (writer.closed) {
        clearInterval(poll);
        return;
      }

      try {
        const current = await prisma.agentTask.findUnique({
          where: { id },
          select: { outputLog: true, status: true },
        });

        if (!current) {
          writer.close();
          clearInterval(poll);
          return;
        }

        const chunks: AgentOutputChunk[] = current.outputLog
          ? JSON.parse(current.outputLog)
          : [];

        // 새 청크만 전송
        if (chunks.length > lastChunkCount) {
          for (let i = lastChunkCount; i < chunks.length; i++) {
            writer.send({
              type: "stage",
              stage: Stage.GENERATING,
              message: chunks[i].content,
              progress: 0,
            });
          }
          lastChunkCount = chunks.length;
        }

        // 종료 상태면 스트림 닫기
        if (TERMINAL_STATUSES.includes(current.status)) {
          writer.send({ type: "complete", data: null, tokenUsage: 0 });
          writer.close();
          clearInterval(poll);
        }
      } catch {
        // polling 에러는 무시 — 다음 interval에서 재시도
      }
    }, 1000);

    // 클라이언트 연결 끊김 시 정리
    request.signal.addEventListener("abort", () => {
      clearInterval(poll);
    });

    // 스트림이 닫힐 때까지 대기
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (writer.closed) {
          clearInterval(check);
          clearInterval(poll);
          resolve();
        }
      }, 500);
    });
  }, request.signal);
}
