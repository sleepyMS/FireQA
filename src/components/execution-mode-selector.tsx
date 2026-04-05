"use client";

import { Server, Bot, AlertTriangle } from "lucide-react";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import { type ExecutionMode } from "@/hooks/use-execution-mode";

export type { ExecutionMode };

export interface AgentStatusResponse {
  onlineCount: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Props {
  value: ExecutionMode;
  onChange: (mode: ExecutionMode) => void;
  disabled?: boolean;
  showWarning?: boolean;
}

export function ExecutionModeSelector({ value, onChange, disabled, showWarning = true }: Props) {
  const { data } = useSWR<AgentStatusResponse>(
    "/api/agent/status",
    fetcher,
    { refreshInterval: value === "agent" ? 5000 : 15000, revalidateOnFocus: true }
  );

  const onlineCount = data?.onlineCount ?? null;
  const agentOnline = onlineCount !== null && onlineCount > 0;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {/* 내 에이전트 — 왼쪽 */}
        <button
          type="button"
          onClick={() => onChange("agent")}
          disabled={disabled}
          className={cn(
            "flex items-center gap-2 rounded-lg border-2 p-3 text-left text-sm transition-all",
            value === "agent" ? "border-primary bg-primary/5" : "border-transparent bg-muted/50 hover:bg-muted",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <Bot className={cn("h-5 w-5 shrink-0", value === "agent" ? "text-primary" : "text-muted-foreground")} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-medium">내 에이전트</p>
              {onlineCount !== null && (
                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", agentOnline ? "bg-green-500" : "bg-gray-300")} />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {onlineCount === null ? "확인 중..." : agentOnline ? `${onlineCount}개 연결됨` : "미연결"}
            </p>
          </div>
        </button>

        {/* 서버 LLM — 오른쪽 */}
        <button
          type="button"
          onClick={() => onChange("server")}
          disabled={disabled}
          className={cn(
            "flex items-center gap-2 rounded-lg border-2 p-3 text-left text-sm transition-all",
            value === "server" ? "border-primary bg-primary/5" : "border-transparent bg-muted/50 hover:bg-muted",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <Server className={cn("h-5 w-5 shrink-0", value === "server" ? "text-primary" : "text-muted-foreground")} />
          <div>
            <p className="font-medium">서버 LLM</p>
            <p className="text-xs text-muted-foreground">빠른 스트리밍</p>
          </div>
        </button>
      </div>

      {showWarning && value === "agent" && !agentOnline && onlineCount !== null && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-2 text-xs text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            연결된 에이전트가 없습니다.{" "}
            <a href="./account" className="underline">에이전트 설정</a>
            에서 먼저 실행하세요.
          </p>
        </div>
      )}
    </div>
  );
}
