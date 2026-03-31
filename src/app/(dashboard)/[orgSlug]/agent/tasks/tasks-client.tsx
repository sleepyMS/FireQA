"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, Terminal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AgentTaskStatus,
  AGENT_TASK_STATUS_CONFIG,
  AGENT_TASK_TYPE_LABEL,
  type AgentTaskView,
} from "@/types/agent";
import { SWR_KEYS } from "@/lib/swr/keys";
import { fetcher } from "@/lib/swr/fetcher";
import { TabNav } from "@/components/ui/tab-nav";

const statusTabs: { value: string; label: string }[] = [
  { value: "", label: "전체" },
  { value: AgentTaskStatus.PENDING, label: "대기" },
  { value: AgentTaskStatus.RUNNING, label: "실행 중" },
  { value: AgentTaskStatus.COMPLETED, label: "완료" },
  { value: AgentTaskStatus.FAILED, label: "실패" },
  { value: AgentTaskStatus.CANCELLED, label: "취소" },
  { value: AgentTaskStatus.TIMED_OUT, label: "시간 초과" },
];

interface Props {
  orgSlug: string;
  initialTasks: AgentTaskView[];
}

export function TasksClient({ orgSlug, initialTasks }: Props) {
  const [activeStatus, setActiveStatus] = useState("");

  const params = new URLSearchParams({ limit: "50" });
  if (activeStatus) params.set("status", activeStatus);
  const swrKey = SWR_KEYS.agentTasks(params.toString());

  const { data } = useSWR<{ tasks: AgentTaskView[] }>(swrKey, fetcher, {
    // 초기 상태(전체)일 때만 서버 데이터를 fallback으로 사용
    fallbackData: activeStatus === "" ? { tasks: initialTasks } : undefined,
    refreshInterval: 10_000,
  });

  const tasks = data?.tasks ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${orgSlug}/agent`}
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          에이전트로 돌아가기
        </Link>
        <h2 className="text-2xl font-bold tracking-tight">작업 목록</h2>
        <p className="text-muted-foreground">
          에이전트가 처리한 모든 작업을 확인합니다.
        </p>
      </div>

      <TabNav
        tabs={statusTabs.map((t) => ({ value: t.value, label: t.label }))}
        value={activeStatus}
        onValueChange={setActiveStatus}
      />

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-20 text-center text-muted-foreground">
            <Terminal className="mb-4 h-12 w-12 opacity-40" />
            <p className="text-sm">
              {activeStatus
                ? `${AGENT_TASK_STATUS_CONFIG[activeStatus]?.label ?? activeStatus} 상태의 작업이 없습니다.`
                : "아직 작업 이력이 없습니다."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const statusConfig = AGENT_TASK_STATUS_CONFIG[task.status];
            const typeLabel = AGENT_TASK_TYPE_LABEL[task.type] ?? task.type;
            const promptPreview =
              task.prompt.length > 80
                ? task.prompt.slice(0, 80) + "..."
                : task.prompt;
            const createdAtStr = task.createdAt
              .slice(0, 16)
              .replace("T", " ");

            return (
              <Link
                key={task.id}
                href={`/${orgSlug}/agent/tasks/${task.id}`}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {typeLabel}
                    </span>
                    {task.project && (
                      <>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">
                          {task.project.name}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm">{promptPreview}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {createdAtStr}
                    {task.errorMessage && (
                      <span className="ml-2 text-destructive">
                        {task.errorMessage.length > 60
                          ? task.errorMessage.slice(0, 60) + "..."
                          : task.errorMessage}
                      </span>
                    )}
                  </p>
                </div>
                {statusConfig && (
                  <Badge
                    variant={statusConfig.variant}
                    className="shrink-0"
                  >
                    {statusConfig.label}
                  </Badge>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
