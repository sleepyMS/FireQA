import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resetMonthlyCredits } from "@/lib/billing/credits";
import { getPlanLimits } from "@/lib/billing/plan-limits";
import { verifyCronSecret } from "@/lib/auth/verify-cron-secret";

export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  // 모든 조직의 크레딧 리셋
  const orgs = await prisma.organization.findMany({
    select: { id: true, plan: true },
  });

  let resetCount = 0;
  for (const org of orgs) {
    const limits = getPlanLimits(org.plan);
    if (limits.monthlyCredits > 0 && limits.monthlyCredits !== Infinity) {
      // monthlyQuota를 플랜 한도로 갱신한 뒤 리셋
      await prisma.creditBalance.upsert({
        where: { organizationId: org.id },
        create: {
          organizationId: org.id,
          balance: limits.monthlyCredits,
          monthlyQuota: limits.monthlyCredits,
          quotaResetAt: new Date(),
        },
        update: { monthlyQuota: limits.monthlyCredits },
      });
      await resetMonthlyCredits(org.id);
      resetCount++;
    }
  }

  return NextResponse.json({ resetCount });
}
