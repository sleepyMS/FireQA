"use client";
import useSWR from "swr";
import { useState } from "react";
import Link from "next/link";
import { X, Zap } from "lucide-react";
import type { AgentStatusResponse } from "@/components/execution-mode-selector";

const fetcher = (url: string) => fetch(url).then(r => r.json());
const DISMISS_KEY = "fireqa:agentBannerDismissed";

export function AgentStatusBanner({ orgSlug }: { orgSlug: string }) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  });
  const { data } = useSWR<AgentStatusResponse>("/api/agent/status", fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  if (dismissed || !data || data.online !== false) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
      <Zap className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        에이전트가 연결되지 않았습니다. 내 에이전트로 실행하려면{" "}
        <code className="rounded bg-amber-100 dark:bg-amber-900 px-1 font-mono text-xs">
          npx fireqa-agent start
        </code>
        를 실행하세요.
      </span>
      <Link
        href={`/${orgSlug}/agent/guide`}
        className="shrink-0 rounded-md bg-amber-100 dark:bg-amber-900 px-2.5 py-1 text-xs font-medium hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
      >
        설정 가이드
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
