"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Zap } from "lucide-react";
import { useAIConfig } from "@/hooks/use-ai-config";

const DISMISS_KEY = "fireqa:agentBannerDismissed";

export function AgentStatusBanner({ orgSlug }: { orgSlug: string }) {
  const { config } = useAIConfig();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY) !== "1") setDismissed(false); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  // 에이전트 모드가 아니거나, 닫혔거나, 에이전트가 온라인이면 숨김
  const agentOffline =
    config.executionMode === "agent" &&
    (!config.agentConnection || config.agentConnection.status !== "online");

  if (!agentOffline || dismissed) return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
      <Zap className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        에이전트가 연결되지 않았습니다. AI 기능을 사용하려면 에이전트를 먼저 실행하세요.
      </span>
      <Link
        href={`/${orgSlug}/account`}
        className="shrink-0 rounded-md bg-amber-100 dark:bg-amber-900 px-2.5 py-1 text-xs font-medium hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
      >
        설정하기
      </Link>
      <button
        onClick={handleDismiss}
        className="shrink-0 rounded p-0.5 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"
        aria-label="닫기"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
