import { prisma } from "@/lib/db";
import { withApiHandler } from "@/lib/api";
import { UserRole } from "@/types/enums";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
});

export const GET = withApiHandler(
  async ({ user, query }) => {
    const orgId = user.organizationId;
    const { page, size } = query;
    const skip = (page - 1) * size;

    const [memberships, total] = await Promise.all([
      prisma.organizationMembership.findMany({
        where: { organizationId: orgId },
        select: {
          role: true,
          joinedAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { joinedAt: "asc" },
        skip,
        take: size,
      }),
      prisma.organizationMembership.count({
        where: { organizationId: orgId },
      }),
    ]);

    const userIds = memberships.map((m) => m.user.id);

    // 각 멤버의 최근 활동 시간과 생성 수를 병렬로 조회
    const [lastActivities, jobCounts] = await Promise.all([
      prisma.activityLog.groupBy({
        by: ["actorId"],
        where: { actorId: { in: userIds }, organizationId: orgId },
        _max: { createdAt: true },
      }),
      prisma.generationJob.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, project: { organizationId: orgId } },
        _count: { _all: true },
      }),
    ]);

    const activityMap = new Map(
      lastActivities.map((a) => [a.actorId, a._max.createdAt]),
    );
    const jobCountMap = new Map(
      jobCounts.map((j) => [j.userId, j._count._all]),
    );

    return {
      members: memberships.map((m) => ({
        id: m.user.id,
        name: m.user.name ?? m.user.email,
        email: m.user.email,
        role: m.role,
        joinedAt: m.joinedAt,
        lastActiveAt: activityMap.get(m.user.id) ?? null,
        jobCount: jobCountMap.get(m.user.id) ?? 0,
      })),
      total,
      page,
      size,
    };
  },
  { minRole: UserRole.ADMIN, querySchema },
);
