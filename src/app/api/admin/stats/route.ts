import { prisma } from "@/lib/db";
import { withApiHandler } from "@/lib/api";
import { UserRole } from "@/types/enums";

export const GET = withApiHandler(
  async ({ user }) => {
    const orgId = user.organizationId;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [projectCount, memberCount, monthlyJobCount, creditBalance] =
      await Promise.all([
        prisma.project.count({
          where: { organizationId: orgId, deletedAt: null },
        }),
        prisma.organizationMembership.count({
          where: { organizationId: orgId },
        }),
        prisma.generationJob.count({
          where: {
            project: { organizationId: orgId },
            createdAt: { gte: monthStart },
          },
        }),
        prisma.creditBalance.findUnique({
          where: { organizationId: orgId },
          select: { balance: true, monthlyQuota: true },
        }),
      ]);

    return {
      projectCount,
      memberCount,
      monthlyJobCount,
      creditBalance: creditBalance?.balance ?? 0,
      monthlyQuota: creditBalance?.monthlyQuota ?? 0,
    };
  },
  { minRole: UserRole.ADMIN },
);
