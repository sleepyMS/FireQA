"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { AgentOutputChunk } from "@/types/agent";

interface Props {
  taskId: string;
  initialStatus: string;
  initialChunks: AgentOutputChunk[];
  onDone?: () => void;
}

const TERMINAL_STATUSES = ["completed", "failed", "cancelled", "timed_out"];

interface SSEPayload {
  type: "stage" | "complete" | "error";
  message?: string;
  chunkType?: string;
  tool?: string;
}

/* ─── Tool name → human-readable label ─── */

function getToolDisplay(tool: string): { icon: string; label: string } {
  const lower = tool.toLowerCase();

  if (lower.includes("figma")) return { icon: "🎨", label: "Figma 작업 중" };
  if (lower === "read") return { icon: "📖", label: "파일 읽는 중" };
  if (lower === "write") return { icon: "✏️", label: "파일 작성 중" };
  if (lower === "edit") return { icon: "✏️", label: "코드 수정 중" };
  if (lower === "glob") return { icon: "🔍", label: "파일 검색 중" };
  if (lower === "grep") return { icon: "🔍", label: "내용 검색 중" };
  if (lower === "bash") return { icon: "⚙️", label: "명령 실행 중" };
  if (lower === "agent") return { icon: "🤖", label: "서브 에이전트 실행 중" };
  if (lower === "webfetch" || lower === "web_fetch") return { icon: "🌐", label: "웹 요청 중" };
  if (lower === "websearch" || lower === "web_search") return { icon: "🌐", label: "웹 검색 중" };

  return { icon: "🔧", label: tool };
}

/* ─── Current phase description ─── */

function getCurrentPhase(
  events: AgentOutputChunk[],
  hasText: boolean,
  done: boolean,
  errorCount: number,
): string {
  if (done) return errorCount > 0 ? "오류로 종료됨" : "생성 완료";
  if (events.length === 0 && !hasText) return "에이전트 작업 준비 중";

  const lastToolEvent = [...events].reverse().find((e) => e.type === "tool_use");
  if (lastToolEvent?.tool) return getToolDisplay(lastToolEvent.tool).label;
  if (hasText) return "📝 내용 생성 중";
  return "분석 중";
}

/* ─── Main component ─── */

export function AgentTaskLogViewer({
  taskId,
  initialStatus,
  initialChunks,
  onDone,
}: Props) {
  const router = useRouter();

  const [eventLines, setEventLines] = useState<AgentOutputChunk[]>(
    initialChunks.filter((c) => c.type !== "text"),
  );
  const [textContent, setTextContent] = useState<string>(
    initialChunks
      .filter((c) => c.type === "text")
      .map((c) => c.content)
      .join(""),
  );
  const [connecting, setConnecting] = useState(
    !TERMINAL_STATUSES.includes(initialStatus),
  );
  const [done, setDone] = useState(TERMINAL_STATUSES.includes(initialStatus));
  const [cancelling, setCancelling] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  /* ── Elapsed timer ── */
  useEffect(() => {
    if (TERMINAL_STATUSES.includes(initialStatus)) return;
    const start = Date.now();
    const timer = setInterval(() => {
      setElapsed((prev) => {
        const next = Math.floor((Date.now() - start) / 1000);
        return next === prev ? prev : next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [initialStatus]);

  /* ── Cancel ── */
  const handleCancel = useCallback(async () => {
    setCancelling(true);
    try {
      await fetch(`/api/agent/tasks/${taskId}`, { method: "DELETE" });
      setDone(true);
      setEventLines((prev) => [
        ...prev,
        {
          type: "error",
          content: "사용자가 작업을 취소했습니다.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch {
      setCancelling(false);
    }
  }, [taskId]);

  /* ── Auto-scroll ── */
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [eventLines, textContent]);

  /* ── Complete handler ── */
  const handleComplete = useCallback(() => {
    setDone(true);
    if (onDone) {
      onDone();
    } else {
      router.refresh();
    }
  }, [router, onDone]);

  /* ── SSE subscription ── */
  useEffect(() => {
    if (TERMINAL_STATUSES.includes(initialStatus)) return;

    const es = new EventSource(`/api/agent/tasks/${taskId}/output`);

    es.onopen = () => setConnecting(false);

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data as string) as SSEPayload;

        if (payload.type === "stage" && payload.message !== undefined) {
          const chunkType = payload.chunkType ?? "text";

          if (chunkType === "text") {
            setTextContent((prev) => prev + payload.message);
          } else {
            setEventLines((prev) => [
              ...prev,
              {
                type: chunkType as AgentOutputChunk["type"],
                content: payload.message!,
                tool: payload.tool,
                timestamp: new Date().toISOString(),
              },
            ]);
          }
        } else if (payload.type === "complete") {
          handleComplete();
          es.close();
        } else if (payload.type === "error") {
          setEventLines((prev) => [
            ...prev,
            {
              type: "error",
              content: payload.message ?? "오류",
              timestamp: new Date().toISOString(),
            },
          ]);
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

    return () => es.close();
  }, [taskId, initialStatus, handleComplete]);

  /* ── Derived stats ── */
  const toolUseCount = eventLines.filter((e) => e.type === "tool_use").length;
  const toolResultCount = eventLines.filter(
    (e) => e.type === "tool_result",
  ).length;
  const errorCount = eventLines.filter((e) => e.type === "error").length;
  const textChars = textContent.length;

  const estimatedProgress = useMemo(() => {
    if (done) return 100;
    if (toolUseCount === 0 && textChars === 0) return 0;
    // tool completion pairs → ~60%, text output → ~35%, cap at 95%
    const pairRatio =
      toolUseCount > 0 ? Math.min(toolResultCount, toolUseCount) / toolUseCount : 0;
    const toolPart = pairRatio * 60;
    const textPart = Math.min(textChars / 5000, 1) * 35;
    return Math.min(Math.round(toolPart + textPart), 95);
  }, [done, toolUseCount, toolResultCount, textChars]);

  const currentPhase = getCurrentPhase(
    eventLines,
    textContent.length > 0,
    done,
    errorCount,
  );

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = minutes > 0 ? `${minutes}분 ${seconds}초` : `${seconds}초`;

  const isEmpty = eventLines.length === 0 && !textContent;

  const trimmed = textContent.trim();
  const isLargeJson = trimmed.length >= 300 && (trimmed.startsWith("{") || trimmed.startsWith("["));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden text-xs font-mono">
      {/* ── Progress header ── */}
      {(!done || !isEmpty) && (
        <div className="border-b border-zinc-800 px-4 py-3 space-y-2">
          {/* Phase + stats row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {!done && (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
              )}
              {done && errorCount === 0 && (
                <span className="text-green-500 shrink-0">✓</span>
              )}
              {done && errorCount > 0 && (
                <span className="text-red-400 shrink-0">✗</span>
              )}
              <span
                className={
                  done
                    ? errorCount > 0
                      ? "text-red-400"
                      : "text-zinc-400"
                    : "text-zinc-200 font-medium"
                }
              >
                {currentPhase}
              </span>
            </div>
            <div className="flex items-center gap-3 text-zinc-500 shrink-0">
              <span>{timeStr} 경과</span>
              {textChars > 0 && (
                <span>{(textChars / 1024).toFixed(1)} KB</span>
              )}
              {toolUseCount > 0 && (
                <span>
                  도구 {toolResultCount}/{toolUseCount}
                </span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                done
                  ? errorCount > 0
                    ? "bg-red-500"
                    : "bg-green-500"
                  : "bg-blue-500"
              }`}
              style={{ width: `${estimatedProgress}%` }}
            />
          </div>

          {/* Cancel button */}
          {!done && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="rounded border border-red-600/30 bg-red-600/10 px-3 py-1 text-xs text-red-400 transition-colors hover:bg-red-600/20 disabled:opacity-50"
              >
                {cancelling ? "취소 중..." : "작업 취소"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Tool activity timeline (collapsible) ── */}
      {eventLines.length > 0 && (
        <div className="border-b border-zinc-800">
          <button
            type="button"
            onClick={() => setTimelineOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-2 text-zinc-400 transition-colors hover:text-zinc-300"
          >
            <span>
              {timelineOpen ? "▾" : "▸"} 작업 내역 ({eventLines.length}개)
            </span>
            {!timelineOpen && (
              <LatestEventSummary events={eventLines} />
            )}
          </button>
          {timelineOpen && (
            <div className="max-h-[300px] space-y-1 overflow-y-auto px-4 pb-3">
              {eventLines.map((chunk, i) => (
                <EventLine key={i} chunk={chunk} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Text stream ── */}
      <div className="max-h-[500px] overflow-y-auto px-4 py-3">
        {connecting && (
          <p className="animate-pulse text-zinc-500">연결 중...</p>
        )}

        {!connecting && isEmpty && !done && (
          <div className="space-y-1">
            <p className="text-yellow-400">⏳ 에이전트 응답 대기 중...</p>
            <p className="text-zinc-600">
              에이전트가 오프라인이면{" "}
              <span className="text-zinc-400">
                npx fireqa-agent@latest start
              </span>{" "}
              를 실행하세요.
            </p>
          </div>
        )}

        {textContent && (
          <>
            {isLargeJson && done ? (
              <details className="group">
                <summary className="cursor-pointer select-none text-zinc-400 hover:text-zinc-300">
                  📄 결과 JSON ({(textContent.length / 1024).toFixed(1)} KB) —
                  클릭하여 펼치기
                </summary>
                <pre className="mt-2 max-h-[400px] overflow-y-auto whitespace-pre-wrap break-words leading-5 text-green-400">
                  {textContent}
                </pre>
              </details>
            ) : (
              <pre className="whitespace-pre-wrap break-words leading-5 text-green-400">
                {textContent}
                {!done && (
                  <span className="animate-pulse text-zinc-400">▌</span>
                )}
              </pre>
            )}
          </>
        )}

        {done && !isEmpty && (
          <p className="mt-3 text-zinc-600">── 완료 ──</p>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function LatestEventSummary({ events }: { events: AgentOutputChunk[] }) {
  const last = events[events.length - 1];
  if (!last) return null;

  const toolName = last.tool ?? last.content;
  const display = getToolDisplay(toolName);

  return (
    <span className="ml-4 max-w-[60%] truncate text-right text-zinc-600">
      최근: {display.icon} {display.label}
    </span>
  );
}

function EventLine({ chunk }: { chunk: AgentOutputChunk }) {
  const timeStr = chunk.timestamp
    ? new Date(chunk.timestamp).toISOString().slice(11, 19)
    : "";

  if (chunk.type === "tool_use") {
    const display = getToolDisplay(chunk.tool ?? chunk.content);
    return (
      <div className="flex items-baseline gap-2">
        <span className="shrink-0 text-zinc-600">{timeStr}</span>
        <span className="text-yellow-400">
          {display.icon} {display.label}
        </span>
        {chunk.tool && display.label !== chunk.tool && (
          <span className="text-[10px] text-zinc-700">({chunk.tool})</span>
        )}
      </div>
    );
  }

  if (chunk.type === "tool_result") {
    const preview =
      chunk.content.length > 100
        ? chunk.content.slice(0, 100) + "…"
        : chunk.content;
    return (
      <div className="flex items-baseline gap-2">
        <span className="shrink-0 text-zinc-600">{timeStr}</span>
        <span className="text-cyan-400">✓</span>
        <span className="truncate text-zinc-500">{preview}</span>
      </div>
    );
  }

  if (chunk.type === "error") {
    return (
      <div className="flex items-baseline gap-2">
        <span className="shrink-0 text-zinc-600">{timeStr}</span>
        <span className="text-red-400">✗ {chunk.content}</span>
      </div>
    );
  }

  return null;
}
