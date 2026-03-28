import { prisma } from "@/lib/db";

// 조직 단위 AI 생성 요청 제한 (시간당)
// 플랜별 차등은 Stripe 연동 후 확장 예정
const HOURLY_LIMIT = 20;

export async function checkRateLimit(
  organizationId: string
): Promise<{ limited: boolean; remaining: number; resetAt: Date }> {
  const windowStart = new Date(Date.now() - 60 * 60 * 1000);

  const count = await prisma.generationJob.count({
    where: {
      project: { organizationId },
      createdAt: { gte: windowStart },
    },
  });

  const remaining = Math.max(0, HOURLY_LIMIT - count);
  const resetAt = new Date(windowStart.getTime() + 60 * 60 * 1000);

  return { limited: count >= HOURLY_LIMIT, remaining, resetAt };
}
