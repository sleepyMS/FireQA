import { prisma } from "@/lib/db";
import type { ActivityAction } from "@/types/enums";
import { deliverWebhooks } from "@/lib/webhooks/deliver";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "activity" });

// 웹훅 전달 대상 이벤트
const WEBHOOK_EVENTS = new Set<ActivityAction>([
  "generation.completed" as ActivityAction,
  "generation.failed" as ActivityAction,
  "member.invited" as ActivityAction,
  "member.role_changed" as ActivityAction,
  "member.removed" as ActivityAction,
  "project.created" as ActivityAction,
  "project.updated" as ActivityAction,
  "project.archived" as ActivityAction,
  "project.unarchived" as ActivityAction,
  "project.deleted" as ActivityAction,
  "project.restored" as ActivityAction,
  "version.created" as ActivityAction,
  "version.activated" as ActivityAction,
  "agent.task_completed" as ActivityAction,
  "agent.task_failed" as ActivityAction,
  "test_run.started" as ActivityAction,
  "test_run.completed" as ActivityAction,
  "test_run.aborted" as ActivityAction,
]);

export function logActivity(params: {
  organizationId: string;
  actorId: string | null;
  action: ActivityAction;
  projectId?: string;
  jobId?: string;
  metadata?: Record<string, unknown>;
}): void {
  prisma.activityLog
    .create({
      data: {
        organizationId: params.organizationId,
        actorId: params.actorId,
        action: params.action,
        projectId: params.projectId ?? null,
        jobId: params.jobId ?? null,
        metadata: JSON.stringify(params.metadata ?? {}),
      },
    })
    .catch((err) => logger.error("활동 로그 저장 실패", { error: err }));

  if (WEBHOOK_EVENTS.has(params.action)) {
    deliverWebhooks(params.organizationId, params.action, {
      actorId: params.actorId,
      projectId: params.projectId ?? null,
      jobId: params.jobId ?? null,
      ...(params.metadata ?? {}),
    });
  }
}
