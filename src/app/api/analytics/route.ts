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

    const [allJobs, topProjects, memberships] = await Promise.all([
      // 최근 30일 전체 job (요약 + 일별 집계용)
      prisma.generationJob.findMany({
        where: {
          project: { organizationId: user.organizationId },
          createdAt: { gte: thirtyDaysAgo },
        },
        select: {
          type: true,
          status: true,
          tokenUsage: true,
          createdAt: true,
          userId: true,
        },
      }),
      // 프로젝트별 job 수 (상위 5)
      prisma.project.findMany({
        where: { organizationId: user.organizationId, status: "active" },
        select: {
          id: true,
          name: true,
          _count: { select: { jobs: true } },
        },
        orderBy: { jobs: { _count: "desc" } },
        take: 5,
      }),
      // 멤버 목록 (이름/이메일 조회용)
      prisma.organizationMembership.findMany({
        where: { organizationId: user.organizationId },
        select: { userId: true, user: { select: { name: true, email: true } } },
      }),
    ]);

    // 전체 요약
    const totalJobs = allJobs.length;
    const completedJobs = allJobs.filter((j) => j.status === "completed").length;
    const failedJobs = allJobs.filter((j) => j.status === "failed").length;
    const totalTokens = allJobs.reduce((sum, j) => sum + (j.tokenUsage ?? 0), 0);
    const thisMonthJobs = allJobs.filter((j) => j.createdAt >= thisMonthStart).length;

    // 타입별 집계
    const byTypeMap = new Map<string, number>();
    for (const job of allJobs) {
      byTypeMap.set(job.type, (byTypeMap.get(job.type) ?? 0) + 1);
    }
    const byType = Array.from(byTypeMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // 최근 30일 일별 집계
    const dailyMap = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
      dailyMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const job of allJobs) {
      const key = job.createdAt.toISOString().slice(0, 10);
      if (dailyMap.has(key)) {
        dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
      }
    }
    const daily = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }));

    // 멤버별 집계 (상위 5)
    const memberMap = new Map<string, number>();
    for (const job of allJobs) {
      if (job.userId) {
        memberMap.set(job.userId, (memberMap.get(job.userId) ?? 0) + 1);
      }
    }
    const memberInfoMap = new Map(memberships.map((m) => [m.userId, m.user]));
    const topMembers = Array.from(memberMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, count]) => ({
        userId,
        name: memberInfoMap.get(userId)?.name ?? null,
        email: memberInfoMap.get(userId)?.email ?? "",
        count,
      }));

    return NextResponse.json({
      summary: { totalJobs, completedJobs, failedJobs, totalTokens, thisMonthJobs },
      byType,
      daily,
      topProjects: topProjects.map((p) => ({ id: p.id, name: p.name, count: p._count.jobs })),
      topMembers,
    });
  } catch (error) {
    console.error("분석 데이터 조회 오류:", error);
    return NextResponse.json({ error: "분석 데이터 조회에 실패했습니다." }, { status: 500 });
  }
}
