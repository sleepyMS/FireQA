"use client";

import Link from "next/link";
import useSWR from "swr";
import { Terminal, Clock, Wifi, WifiOff, Cloud, Server, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AGENT_TASK_STATUS_CONFIG,
  AGENT_TASK_TYPE_LABEL,
  type AgentConnectionView,
  type AgentTaskView,
} from "@/types/agent";
import { SWR_KEYS } from "@/lib/swr/keys";
import { fetcher } from "@/lib/swr/fetcher";
import { useDynamicRefresh } from "@/hooks/use-dynamic-refresh";

interface Props {
  orgSlug: string;
  initialConnections: AgentConnectionView[];
  initialTasks: AgentTaskView[];
}

type DashboardData = {
  connections: AgentConnectionView[];
  tasks: AgentTaskView[];
};

// Phase 4.5: 호스티드 워커 통계
type HostedWorkersData = {
  workers: {
    idle: number;
    busy: number;
    starting: number;
    stopping: number;
    error: number;
  };
  queueDepth: number;
  avgProcessingTimeMs: number;
};

export function AgentDashboardClient({ orgSlug, initialConnections, initialTasks }: Props) {
  const dashRefresh = useDynamicRefresh<DashboardData>({
    activeInterval: 10_000,
    idleInterval: 30_000,
    fingerprint: (d) =>
      `${d.connections.length}:${d.connections.map((c) => c.id + c.status).join(",")}|${d.tasks.length}:${d.tasks[0]?.id ?? ""}:${d.tasks[0]?.status ?? ""}`,
  });
  const { data } = useSWR<DashboardData>(
    SWR_KEYS.agentDashboard,
    fetcher,
    {
      fallbackData: { connections: initialConnections, tasks: initialTasks },
      refreshInterval: dashRefresh.refreshInterval,
      onSuccess: dashRefresh.onSuccess,
    }
  );

  // Phase 4.5: 호스티드 워커 상태 조회
  const workersRefresh = useDynamicRefresh<HostedWorkersData>({
    activeInterval: 15_000,
    idleInterval: 60_000,
    fingerprint: (d) =>
      `${d.workers.idle},${d.workers.busy},${d.workers.starting},${d.workers.stopping},${d.workers.error}|${d.queueDepth}|${d.avgProcessingTimeMs}`,
  });
  const { data: workersData } = useSWR<HostedWorkersData>(
    SWR_KEYS.hostedWorkers,
    fetcher,
    {
      refreshInterval: workersRefresh.refreshInterval,
      onSuccess: workersRefresh.onSuccess,
    }
  );

  const connections = data?.connections ?? initialConnections;
  const recentTasks = data?.tasks ?? initialTasks;
  const workers = workersData?.workers;
  const totalWorkers = workers
    ? workers.idle + workers.busy + workers.starting + workers.stopping + workers.error
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">에이전트</h2>
        <p className="text-muted-foreground">
          fireqa-agent CLI로 로컬 Claude Code를 연결합니다.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wifi className="h-4 w-4 text-muted-foreground" />
            연결된 에이전트
          </CardTitle>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                아직 연결된 에이전트가 없습니다. 아래 안내에 따라 로컬 머신에
                에이전트를 설치하고 연결하세요.
              </p>
              <div className="rounded-lg border bg-zinc-950 p-4 text-sm text-zinc-100">
                <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
                  <Terminal className="h-3.5 w-3.5" />
                  <span>터미널</span>
                </div>
                <div className="space-y-1 font-mono">
                  <p>
                    <span className="text-zinc-500"># 1. FireQA 계정에 로그인</span>
                  </p>
                  <p className="text-green-400">npx fireqa-agent login</p>
                  <p className="mt-3 text-zinc-500"># 2. 에이전트 시작</p>
                  <p className="text-green-400">npx fireqa-agent start</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                에이전트가 시작되면 이 페이지에 자동으로 표시됩니다.
              </p>
              <Link
                href={`/${orgSlug}/agent/guide`}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                자세한 설치 가이드 보기 →
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {connections.map((conn) => {
                const meta = conn.metadata ?? {};
                const isOnline = conn.status === "online";
                return (
                  <div
                    key={conn.id}
                    className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="shrink-0">
                      {isOnline ? (
                        <Wifi className="h-4 w-4 text-green-500" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{conn.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {meta.os ? `${meta.os} · ` : ""}
                        {meta.cli ?? meta.version ?? ""}
                        {conn.lastHeartbeat
                          ? ` · 마지막 응답: ${conn.lastHeartbeat
                              .slice(0, 16)
                              .replace("T", " ")}`
                          : ""}
                      </p>
                    </div>
                    <Badge variant={isOnline ? "default" : "secondary"}>
                      {isOnline ? "온라인" : "오프라인"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phase 4.5: 호스티드 워커 통계 카드 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Cloud className="h-4 w-4 text-muted-foreground" />
            호스티드 워커
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!workersData ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              호스티드 워커 정보를 불러오는 중...
            </p>
          ) : totalWorkers === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              현재 가동 중인 호스티드 워커가 없습니다.
            </p>
          ) : (
            <div className="space-y-4">
              {/* 상태별 워커 수 */}
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {([
                  { key: "idle", label: "대기", color: "text-green-500" },
                  { key: "busy", label: "작업 중", color: "text-blue-500" },
                  { key: "starting", label: "시작 중", color: "text-amber-500" },
                  { key: "stopping", label: "종료 중", color: "text-muted-foreground" },
                  { key: "error", label: "오류", color: "text-destructive" },
                ] as const).map(({ key, label, color }) => (
                  <div key={key} className="rounded-lg border p-3 text-center">
                    <Server className={`mx-auto h-4 w-4 ${color}`} />
                    <p className="mt-1 text-lg font-bold tabular-nums">
                      {workers?.[key] ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              {/* 큐 깊이 & 평균 처리 시간 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium tabular-nums">
                      {workersData.queueDepth}
                    </p>
                    <p className="text-xs text-muted-foreground">큐 깊이</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium tabular-nums">
                      {workersData.avgProcessingTimeMs > 0
                        ? `${(workersData.avgProcessingTimeMs / 1000).toFixed(1)}s`
                        : "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">평균 처리 시간</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-muted-foreground" />
              최근 작업
            </CardTitle>
            {recentTasks.length > 0 && (
              <Link
                href={`/${orgSlug}/agent/tasks`}
                className="text-xs text-primary hover:underline"
              >
                전체 보기 →
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {recentTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Terminal className="mb-3 h-10 w-10 opacity-40" />
              <p className="text-sm">아직 작업 이력이 없습니다.</p>
              <p className="mt-1 text-xs">
                에이전트를 연결하면 작업이 여기에 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTasks.map((task) => {
                const statusConfig = AGENT_TASK_STATUS_CONFIG[task.status];
                const typeLabel =
                  AGENT_TASK_TYPE_LABEL[task.type] ?? task.type;
                const promptPreview =
                  task.prompt.length > 60
                    ? task.prompt.slice(0, 60) + "..."
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
        </CardContent>
      </Card>
    </div>
  );
}
