import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const { organizationId } = user;

    const orgDateFilter = {
      project: { organizationId },
      createdAt: { gte: thirtyDaysAgo },
    };

    const [summary, thisMonth, byStatus, byType, dailyRaw, topProjects, memberJobCounts, memberships] =
      await Promise.all([
        // 요약: 총 건수 + 토큰 합계
        prisma.generationJob.aggregate({
          where: orgDateFilter,
          _count: true,
          _sum: { tokenUsage: true },
        }),
        // 이번 달 건수
        prisma.generationJob.count({
          where: { project: { organizationId }, createdAt: { gte: thisMonthStart } },
        }),
        // 상태별 집계
        prisma.generationJob.groupBy({
          by: ["status"],
          where: orgDateFilter,
          _count: true,
        }),
        // 타입별 집계
        prisma.generationJob.groupBy({
          by: ["type"],
          where: orgDateFilter,
          _count: true,
          orderBy: { _count: { type: "desc" } },
        }),
        // 일별 집계 — Prisma groupBy는 date trunc 미지원이므로 $queryRaw 사용
        prisma.$queryRaw<{ date: Date; count: number }[]>`
          SELECT DATE("createdAt") as date, COUNT(*)::int as count
          FROM "GenerationJob" gj
          JOIN "Project" p ON gj."projectId" = p.id
          WHERE p."organizationId" = ${organizationId}
            AND gj."createdAt" >= ${thirtyDaysAgo}
          GROUP BY DATE("createdAt")
          ORDER BY date
        `,
        // 프로젝트별 job 수 (상위 5)
        prisma.project.findMany({
          where: { organizationId, status: "active" },
          select: { id: true, name: true, _count: { select: { jobs: true } } },
          orderBy: { jobs: { _count: "desc" } },
          take: 5,
        }),
        // 멤버별 job 수 (상위 5)
        prisma.generationJob.groupBy({
          by: ["userId"],
          where: { ...orgDateFilter, userId: { not: null } },
          _count: true,
          orderBy: { _count: { userId: "desc" } },
          take: 5,
        }),
        // 멤버 이름/이메일 조회용
        prisma.organizationMembership.findMany({
          where: { organizationId },
          select: { userId: true, user: { select: { name: true, email: true } } },
        }),
      ]);

    // 상태별 카운트 추출
    const statusMap = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));
    const completedJobs = statusMap["completed"] ?? 0;
    const failedJobs = statusMap["failed"] ?? 0;

    // 일별 데이터: 30일 빈 날짜 채우기
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

    // 멤버별 집계에 이름/이메일 조인
    const memberInfoMap = new Map(memberships.map((m) => [m.userId, m.user]));
    const topMembers = memberJobCounts.map(({ userId, _count }) => ({
      userId: userId ?? "",
      name: memberInfoMap.get(userId ?? "")?.name ?? null,
      email: memberInfoMap.get(userId ?? "")?.email ?? "",
      count: _count,
    }));

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("분석 데이터 조회 오류:", error);
    return NextResponse.json({ error: "분석 데이터 조회에 실패했습니다." }, { status: 500 });
  }
}
