import { prisma } from "@/lib/db";
import { createTTLCache } from "@/lib/cache/ttl-cache";

// 5분 TTL 인메모리 캐시 — 플랜 조회는 매 요청마다 발생하므로 DB 부하 감소
const planCache = createTTLCache<string>(5 * 60_000);

export async function getOrgPlan(organizationId: string): Promise<string> {
  const cached = planCache.get(organizationId);
  if (cached !== undefined) return cached;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true },
  });
  const plan = org?.plan ?? "free";
  planCache.set(organizationId, plan);
  return plan;
}

export function invalidateOrgPlanCache(organizationId: string) {
  planCache.delete(organizationId);
}
