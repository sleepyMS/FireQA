import { prisma } from "@/lib/db";
import { getPlanLimits } from "@/lib/billing/plan-limits";
import { getOrgPlan } from "@/lib/billing/get-org-plan";

export async function checkRateLimit(
  organizationId: string
): Promise<{ limited: boolean; remaining: number; resetAt: Date }> {
  const windowStart = new Date(Date.now() - 60 * 60 * 1000);

  const [plan, count] = await Promise.all([
    getOrgPlan(organizationId),
    prisma.generationJob.count({
      where: {
        project: { organizationId },
        createdAt: { gte: windowStart },
      },
    }),
  ]);

  const hourlyLimit = getPlanLimits(plan).generationsPerHour;
  const remaining = Math.max(0, hourlyLimit - count);
  const resetAt = new Date(Date.now() + 60 * 60 * 1000);

  return { limited: count >= hourlyLimit, remaining, resetAt };
}
