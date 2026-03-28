import { prisma } from "@/lib/db";
import { getPlanLimits } from "@/lib/billing/plan-limits";
import { getOrgPlan } from "@/lib/billing/get-org-plan";
import { createTTLCache } from "@/lib/cache/ttl-cache";

// 5분 TTL 인메모리 카운터 — 동일 창 내 반복 DB count 쿼리 방지
const rateLimitCache = createTTLCache<number>(5 * 60_000);

async function syncCountFromDB(organizationId: string): Promise<number> {
  const windowStart = new Date(Date.now() - 60 * 60 * 1000);
  const count = await prisma.generationJob.count({
    where: { project: { organizationId }, createdAt: { gte: windowStart } },
  });
  rateLimitCache.set(organizationId, count);
  return count;
}

export async function checkRateLimit(
  organizationId: string
): Promise<{ limited: boolean; remaining: number; resetAt: Date }> {
  const plan = await getOrgPlan(organizationId);

  const cached = rateLimitCache.get(organizationId);
  const count = cached !== undefined ? cached : await syncCountFromDB(organizationId);

  const hourlyLimit = getPlanLimits(plan).generationsPerHour;
  const remaining = Math.max(0, hourlyLimit - count);
  const resetAt = new Date(Date.now() + 60 * 60 * 1000);

  return { limited: count >= hourlyLimit, remaining, resetAt };
}

// 생성 Job 생성 직후 호출 — DB 재조회 없이 카운터 증분
export function incrementRateCount(organizationId: string) {
  rateLimitCache.update(organizationId, (n) => n + 1);
}
