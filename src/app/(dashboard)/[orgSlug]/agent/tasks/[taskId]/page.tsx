export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AGENT_TASK_STATUS_CONFIG,
  AGENT_TASK_TYPE_LABEL,
  AgentTaskStatus,
} from "@/types/agent";
import type { AgentOutputChunk } from "@/types/agent";
import { AgentTaskLogViewer } from "./log-viewer";
import { CancelButton } from "./cancel-button";
import { TaskResultPreview } from "@/components/agent/task-result-preview";

// ─── Server Component ───

export default async function AgentTaskDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; taskId: string }>;
}) {
  const { orgSlug, taskId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/onboarding");
  }

  const task = await prisma.agentTask.findUnique({
    where: { id: taskId },
    include: {
      project: { select: { id: true, name: true } },
      connection: { select: { name: true } },
    },
  });

  if (!task || task.organizationId !== user.organizationId) {
    notFound();
  }

  // 기존 outputLog 파싱
  let initialChunks: AgentOutputChunk[] = [];
  if (task.outputLog) {
    try {
      initialChunks = JSON.parse(task.outputLog) as AgentOutputChunk[];
    } catch {
      // 파싱 실패 시 빈 배열 유지
    }
  }

  const statusConfig = AGENT_TASK_STATUS_CONFIG[task.status];
  const typeLabel = AGENT_TASK_TYPE_LABEL[task.type] ?? task.type;

  const ACTIVE_STATUSES: string[] = [
    AgentTaskStatus.PENDING,
    AgentTaskStatus.ASSIGNED,
    AgentTaskStatus.RUNNING,
  ];
  const isActive = ACTIVE_STATUSES.includes(task.status);

  const createdAtStr = task.createdAt.toISOString().slice(0, 16).replace("T", " ");
  const startedAtStr = task.startedAt
    ? task.startedAt.toISOString().slice(0, 16).replace("T", " ")
    : null;
  const completedAtStr = task.completedAt
    ? task.completedAt.toISOString().slice(0, 16).replace("T", " ")
    : null;

  // 소요 시간 계산
  let durationStr: string | null = null;
  if (task.startedAt && task.completedAt) {
    const durationMs = task.completedAt.getTime() - task.startedAt.getTime();
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    durationStr = minutes > 0 ? `${minutes}분 ${seconds}초` : `${seconds}초`;
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Link
          href={`/${orgSlug}/agent`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          에이전트
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">{typeLabel}</span>
        {statusConfig && (
          <Badge variant={statusConfig.variant} className="ml-1">
            {statusConfig.label}
          </Badge>
        )}
        {isActive && (
          <div className="ml-auto">
            <CancelButton taskId={taskId} orgSlug={orgSlug} />
          </div>
        )}
      </div>

      {/* 본문 2컬럼 레이아웃 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 로그 뷰어 (좌측, 2/3) */}
        <div className="lg:col-span-2">
          <Card className="pb-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">실행 로그</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <AgentTaskLogViewer
                taskId={taskId}
                initialStatus={task.status}
                initialChunks={initialChunks}
              />
            </CardContent>
          </Card>
        </div>

        {/* 작업 정보 카드 (우측, 1/3) */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">작업 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow label="상태">
                {statusConfig ? (
                  <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                ) : (
                  <span>{task.status}</span>
                )}
              </InfoRow>
              <InfoRow label="유형">
                <span>{typeLabel}</span>
              </InfoRow>
              <InfoRow label="프로젝트">
                <span>{task.project?.name ?? "-"}</span>
              </InfoRow>
              <InfoRow label="에이전트">
                <span>{task.connection?.name ?? "-"}</span>
              </InfoRow>
              <InfoRow label="생성">
                <span className="tabular-nums text-muted-foreground">{createdAtStr}</span>
              </InfoRow>
              {startedAtStr && (
                <InfoRow label="시작">
                  <span className="tabular-nums text-muted-foreground">{startedAtStr}</span>
                </InfoRow>
              )}
              <InfoRow label="완료">
                <span className="tabular-nums text-muted-foreground">
                  {completedAtStr ?? "-"}
                </span>
              </InfoRow>
              {durationStr && (
                <InfoRow label="소요 시간">
                  <span className="tabular-nums font-medium">{durationStr}</span>
                </InfoRow>
              )}

              {task.errorMessage && (
                <div className="pt-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">오류 메시지</p>
                  <p className="text-xs text-destructive break-words">{task.errorMessage}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 프롬프트 카드 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">프롬프트</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap break-words text-xs font-mono bg-muted rounded-md p-3 max-h-48 overflow-y-auto leading-relaxed">
                {task.prompt}
              </pre>
            </CardContent>
          </Card>

          {/* 결과 카드 */}
          {task.result && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">결과</CardTitle>
              </CardHeader>
              <CardContent>
                <TaskResultPreview
                  taskType={task.type}
                  taskId={task.id}
                  projectName={task.project?.name ?? ""}
                  rawResult={task.result}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 작업 정보 행 레이아웃 헬퍼 ───

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}
