import { prisma } from "@/lib/db";
import type { ActivityAction } from "@/types/enums";
import { deliverWebhooks } from "@/lib/webhooks/deliver";

// 웹훅 전달 대상 이벤트
const WEBHOOK_EVENTS = new Set<ActivityAction>([
  "generation.completed" as ActivityAction,
  "generation.failed" as ActivityAction,
  "member.invited" as ActivityAction,
  "project.created" as ActivityAction,
  "agent.task_completed" as ActivityAction,
  "agent.task_failed" as ActivityAction,
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
    .catch(console.error);

  if (WEBHOOK_EVENTS.has(params.action)) {
    deliverWebhooks(params.organizationId, params.action, {
      actorId: params.actorId,
      projectId: params.projectId ?? null,
      jobId: params.jobId ?? null,
      ...(params.metadata ?? {}),
    });
  }
}
