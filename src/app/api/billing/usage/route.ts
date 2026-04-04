import { prisma } from "@/lib/db";
import { getPlanLimits } from "@/lib/billing/plan-limits";
import { withApiHandler, ApiError } from "@/lib/api";

// GET /api/billing/usage — 사용량 조회
export const GET = withApiHandler(
  async ({ user }) => {
    const windowStart = new Date(Date.now() - 60 * 60 * 1000);

    const [org, generationsThisHour, projectCount, memberCount] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: {
          id: true,
          plan: true,
          subscription: {
            select: {
              plan: true,
              status: true,
              currentPeriodEnd: true,
              cancelAtPeriodEnd: true,
            },
          },
        },
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
      throw ApiError.notFound("조직");
    }

    const plan = org.subscription?.plan ?? org.plan;
    const limits = getPlanLimits(plan);

    return {
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
    };
  },
);
