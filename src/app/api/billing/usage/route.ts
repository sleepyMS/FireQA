import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/db";
import { getPlanLimits } from "@/lib/billing/plan-limits";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const windowStart = new Date(Date.now() - 60 * 60 * 1000);

    const [org, generationsThisHour, projectCount, memberCount] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: user.organizationId },
        include: { subscription: true },
      }),
      prisma.generationJob.count({
        where: {
          project: { organizationId: user.organizationId },
          createdAt: { gte: windowStart },
        },
      }),
      prisma.project.count({
        where: { organizationId: user.organizationId, status: "active" },
      }),
      prisma.organizationMembership.count({
        where: { organizationId: user.organizationId },
      }),
    ]);

    if (!org) {
      return NextResponse.json({ error: "조직을 찾을 수 없습니다." }, { status: 404 });
    }

    const plan = org.subscription?.plan ?? org.plan;
    const limits = getPlanLimits(plan);

    return NextResponse.json({
      plan,
      subscription: org.subscription
        ? {
            status: org.subscription.status,
            currentPeriodEnd: org.subscription.currentPeriodEnd,
            cancelAtPeriodEnd: org.subscription.cancelAtPeriodEnd,
          }
        : null,
      usage: {
        generationsThisHour,
        projectCount,
        memberCount,
      },
      limits: {
        generationsPerHour: limits.generationsPerHour,
        projectsMax: limits.projectsMax === Infinity ? null : limits.projectsMax,
        membersMax: limits.membersMax === Infinity ? null : limits.membersMax,
        uploadsMaxMb: limits.uploadsMaxMb,
      },
    });
  } catch (error) {
    console.error("사용량 조회 오류:", error);
    return NextResponse.json({ error: "사용량 조회에 실패했습니다." }, { status: 500 });
  }
}
