"use client";

import Link from "next/link";
import { Bot, Server, AlertTriangle } from "lucide-react";
import { useAIConfig } from "@/hooks/use-ai-config";
import { MODEL_OPTIONS } from "@/components/model-selector";
import { cn } from "@/lib/utils";

interface Props {
  orgSlug: string;
}

export function AIConfigBanner({ orgSlug }: Props) {
  const { config, isLoading } = useAIConfig();

  if (isLoading) return null;

  const isAgent = config.executionMode === "agent";
  const agentOffline = isAgent && config.agentConnection?.status !== "online";

  let label: string;
  if (isAgent) {
    const connName = config.agentConnection?.name ?? "미설정";
    const modelName = config.agentModel ?? "모델 미설정";
    label = `에이전트 · ${connName} · ${modelName}`;
  } else {
    const modelLabel = MODEL_OPTIONS.find((m) => m.value === config.serverModel)?.label ?? config.serverModel;
    label = `서버 LLM · ${modelLabel}`;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
        agentOffline
          ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
          : "border bg-muted/50 text-muted-foreground"
      )}
    >
      {agentOffline ? (
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
      ) : isAgent ? (
        <Bot className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <Server className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="flex-1">
        {agentOffline ? "선택된 에이전트가 오프라인입니다. " : ""}
        {label}
      </span>
      <Link
        href={`/${orgSlug}/account`}
        className={cn(
          "shrink-0 underline",
          agentOffline ? "text-amber-800 dark:text-amber-300" : "text-muted-foreground hover:text-foreground"
        )}
      >
        변경
      </Link>
    </div>
  );
}
