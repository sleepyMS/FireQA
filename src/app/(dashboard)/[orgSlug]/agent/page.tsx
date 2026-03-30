export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Terminal, Clock, Wifi, WifiOff } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AGENT_TASK_STATUS_CONFIG,
  AGENT_TASK_TYPE_LABEL,
} from "@/types/agent";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/onboarding");
  }

  const organizationId = user.organizationId;

  const [connections, recentTasks] = await Promise.all([
    prisma.agentConnection.findMany({
      where: { organizationId },
      orderBy: { lastHeartbeat: "desc" },
      take: 10,
    }),
    prisma.agentTask.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        project: { select: { id: true, name: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">에이전트</h2>
        <p className="text-muted-foreground">
          fireqa-agent CLI로 로컬 Claude Code를 연결합니다.
        </p>
      </div>

      {/* 연결된 에이전트 섹션 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wifi className="h-4 w-4 text-muted-foreground" />
            연결된 에이전트
          </CardTitle>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            /* 설정 안내 카드 */
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
                // metadata JSON 파싱 (안전하게)
                let meta: { cli?: string; os?: string; version?: string } = {};
                try {
                  meta = JSON.parse(conn.metadata);
                } catch {
                  // JSON 파싱 실패 시 빈 객체 유지
                }
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
                              .toISOString()
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

      {/* 최근 작업 섹션 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-muted-foreground" />
              최근 작업
            </CardTitle>
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
                    ? task.prompt.slice(0, 60) + "…"
                    : task.prompt;
                const createdAtStr = task.createdAt
                  .toISOString()
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
