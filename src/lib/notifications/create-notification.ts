import { prisma } from "@/lib/db";

export function createNotification(params: {
  userId: string;
  organizationId: string;
  type: string;
  title: string;
  linkUrl?: string;
  metadata?: Record<string, unknown>;
}): void {
  prisma.notification
    .create({
      data: {
        userId: params.userId,
        organizationId: params.organizationId,
        type: params.type,
        title: params.title,
        linkUrl: params.linkUrl ?? null,
        metadata: JSON.stringify(params.metadata ?? {}),
      },
    })
    .catch(console.error);
}
