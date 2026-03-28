import { prisma } from "@/lib/db";

export interface AnalyticsData {
  summary: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    totalTokens: number;
    thisMonthJobs: number;
  };
  byType: { type: string; count: number }[];
  daily: { date: string; count: number }[];
  topProjects: { id: string; name: string; count: number }[];
  topMembers: { userId: string; name: string | null; email: string; count: number }[];
}

export async function getAnalyticsData(organizationId: string): Promise<AnalyticsData> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const orgDateFilter = {
    project: { organizationId },
    createdAt: { gte: thirtyDaysAgo },
  };

  const [summary, thisMonth, byStatus, byType, dailyRaw, topProjects, memberJobCounts, memberships] =
    await Promise.all([
      prisma.generationJob.aggregate({ where: orgDateFilter, _count: true, _sum: { tokenUsage: true } }),
      prisma.generationJob.count({ where: { project: { organizationId }, createdAt: { gte: thisMonthStart } } }),
      prisma.generationJob.groupBy({ by: ["status"], where: orgDateFilter, _count: true }),
      prisma.generationJob.groupBy({
        by: ["type"],
        where: orgDateFilter,
        _count: true,
        orderBy: { _count: { type: "desc" } },
      }),
      prisma.$queryRaw<{ date: Date; count: number }[]>`
        SELECT DATE("createdAt") as date, COUNT(*)::int as count
        FROM "GenerationJob" gj
        JOIN "Project" p ON gj."projectId" = p.id
        WHERE p."organizationId" = ${organizationId}
          AND gj."createdAt" >= ${thirtyDaysAgo}
        GROUP BY DATE("createdAt")
        ORDER BY date
      `,
      prisma.project.findMany({
        where: { organizationId, status: "active" },
        select: { id: true, name: true, _count: { select: { jobs: true } } },
        orderBy: { jobs: { _count: "desc" } },
        take: 5,
      }),
      prisma.generationJob.groupBy({
        by: ["userId"],
        where: { ...orgDateFilter, userId: { not: null } },
        _count: true,
        orderBy: { _count: { userId: "desc" } },
        take: 5,
      }),
      prisma.organizationMembership.findMany({
        where: { organizationId },
        select: { userId: true, user: { select: { name: true, email: true } } },
      }),
    ]);

  const statusMap = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));
  const completedJobs = statusMap["completed"] ?? 0;
  const failedJobs = statusMap["failed"] ?? 0;

  const dailyMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
    dailyMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of dailyRaw) {
    const key = new Date(row.date).toISOString().slice(0, 10);
    if (dailyMap.has(key)) dailyMap.set(key, row.count);
  }
  const daily = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }));

  const memberInfoMap = new Map(memberships.map((m) => [m.userId, m.user]));
  const topMembers = memberJobCounts.map(({ userId, _count }) => ({
    userId: userId ?? "",
    name: memberInfoMap.get(userId ?? "")?.name ?? null,
    email: memberInfoMap.get(userId ?? "")?.email ?? "",
    count: _count,
  }));

  return {
    summary: {
      totalJobs: summary._count,
      completedJobs,
      failedJobs,
      totalTokens: summary._sum.tokenUsage ?? 0,
      thisMonthJobs: thisMonth,
    },
    byType: byType.map((t) => ({ type: t.type, count: t._count })),
    daily,
    topProjects: topProjects.map((p) => ({ id: p.id, name: p.name, count: p._count.jobs })),
    topMembers,
  };
}
