"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentOutputChunk } from "@/types/agent";

interface Props {
  taskId: string;
  initialStatus: string;
  orgSlug: string;
  initialChunks: AgentOutputChunk[];
}

const TERMINAL_STATUSES = ["completed", "failed", "cancelled", "timed_out"];

// SSE 이벤트 타입 (createSSEStream 포맷)
interface SSEStageEvent {
  type: "stage";
  stage: string;
  message: string;
  progress?: number;
}

interface SSECompleteEvent {
  type: "complete";
  data: unknown;
  tokenUsage: number;
}

interface SSEErrorEvent {
  type: "error";
  message: string;
}

type SSEPayload = SSEStageEvent | SSECompleteEvent | SSEErrorEvent;

export function AgentTaskLogViewer({
  taskId,
  initialStatus,
  initialChunks,
}: Props) {
  const [chunks, setChunks] = useState<AgentOutputChunk[]>(initialChunks);
  const [connecting, setConnecting] = useState(!TERMINAL_STATUSES.includes(initialStatus));
  const [done, setDone] = useState(TERMINAL_STATUSES.includes(initialStatus));
  const bottomRef = useRef<HTMLDivElement>(null);

  // 새 청크 추가 시 자동 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chunks]);

  // SSE 연결 (종료 상태가 아닌 경우에만)
  useEffect(() => {
    if (TERMINAL_STATUSES.includes(initialStatus)) return;

    const es = new EventSource(`/api/agent/tasks/${taskId}/output`);

    es.onopen = () => {
      setConnecting(false);
    };

    // createSSEStream은 named event 없이 'message' 이벤트로 데이터를 전송
    es.onmessage = (event) => {
      try {
        const payload: SSEPayload = JSON.parse(event.data as string);
        if (payload.type === "stage") {
          // stage 이벤트 — content를 text 청크로 추가
          const newChunk: AgentOutputChunk = {
            type: "text",
            content: payload.message,
            timestamp: new Date().toISOString(),
          };
          setChunks((prev) => [...prev, newChunk]);
        } else if (payload.type === "complete") {
          setDone(true);
          es.close();
        } else if (payload.type === "error") {
          const errChunk: AgentOutputChunk = {
            type: "error",
            content: payload.message,
            timestamp: new Date().toISOString(),
          };
          setChunks((prev) => [...prev, errChunk]);
          setDone(true);
          es.close();
        }
      } catch {
        // JSON 파싱 실패 무시
      }
    };

    es.onerror = () => {
      setConnecting(false);
      es.close();
    };

    return () => {
      es.close();
    };
  }, [taskId, initialStatus]);

  return (
    <div className="rounded-b-xl bg-zinc-950 overflow-y-auto max-h-[600px] p-4 font-mono text-xs">
      {/* 연결 중 표시 */}
      {connecting && (
        <p className="text-zinc-400 animate-pulse">연결 중...</p>
      )}

      {/* 로그 없음 상태 */}
      {!connecting && chunks.length === 0 && !done && initialStatus === "pending" && (
        <div className="space-y-1">
          <p className="text-yellow-400">⏳ 에이전트 대기 중...</p>
          <p className="text-zinc-500 text-[11px]">
            에이전트가 오프라인이거나 아직 작업을 수령하지 않았습니다.
            터미널에서 <span className="text-zinc-300">npx fireqa-agent@latest start</span> 를 실행하세요.
          </p>
        </div>
      )}
      {!connecting && chunks.length === 0 && !done && status !== "pending" && (
        <p className="text-zinc-500">
          로그가 없습니다. 에이전트가 작업을 시작하면 여기에 출력됩니다.
        </p>
      )}

      {/* 대기 중인 경우 (done이지만 청크 없음) */}
      {!connecting && chunks.length === 0 && done && (
        <p className="text-zinc-500">에이전트 응답 대기 중...</p>
      )}

      {/* 로그 라인 */}
      {chunks.map((chunk, i) => (
        <LogLine key={i} chunk={chunk} />
      ))}

      {/* 완료 상태 표시 */}
      {done && chunks.length > 0 && (
        <p className="mt-2 text-zinc-500">── 작업 완료 ──</p>
      )}

      {/* 자동 스크롤 앵커 */}
      <div ref={bottomRef} />
    </div>
  );
}

function LogLine({ chunk }: { chunk: AgentOutputChunk }) {
  const timeStr = chunk.timestamp
    ? new Date(chunk.timestamp).toISOString().slice(11, 19)
    : "";

  if (chunk.type === "tool_use") {
    return (
      <div className="flex gap-2 leading-5">
        <span className="text-zinc-600 shrink-0">{timeStr}</span>
        <span className="text-yellow-400">
          {"\uD83D\uDD27"} tool: {chunk.tool ?? chunk.content}
        </span>
      </div>
    );
  }

  if (chunk.type === "tool_result") {
    return (
      <div className="flex gap-2 leading-5">
        <span className="text-zinc-600 shrink-0">{timeStr}</span>
        <span className="text-cyan-400">{"\u2713"} {chunk.content}</span>
      </div>
    );
  }

  if (chunk.type === "error") {
    return (
      <div className="flex gap-2 leading-5">
        <span className="text-zinc-600 shrink-0">{timeStr}</span>
        <span className="text-red-400">{chunk.content}</span>
      </div>
    );
  }

  // type === "text" (기본)
  return (
    <div className="flex gap-2 leading-5">
      <span className="text-zinc-600 shrink-0">{timeStr}</span>
      <span className="text-green-400 whitespace-pre-wrap break-words">{chunk.content}</span>
    </div>
  );
}
