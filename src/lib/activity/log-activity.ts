import { prisma } from "@/lib/db";

export function logActivity(params: {
  organizationId: string;
  actorId: string | null;
  action: string;
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
}
