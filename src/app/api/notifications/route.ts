import { prisma } from "@/lib/db";
import {
  withApiHandler,
  getNotificationsSchema,
  type GetNotificationsQuery,
} from "@/lib/api";

// GET /api/notifications — 알림 목록 조회
export const GET = withApiHandler<unknown, GetNotificationsQuery>(
  async ({ user, query }) => {
    const includeRead = query.all === "1";

    const where = {
      userId: user.userId,
      organizationId: user.organizationId,
      ...(includeRead ? {} : { isRead: false }),
    };

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          type: true,
          title: true,
          linkUrl: true,
          isRead: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({
        where: { userId: user.userId, organizationId: user.organizationId, isRead: false },
      }),
    ]);

    return {
      notifications: notifications.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    };
  },
  { querySchema: getNotificationsSchema },
);
