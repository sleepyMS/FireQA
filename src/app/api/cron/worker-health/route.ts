import { NextRequest, NextResponse } from "next/server";
import { WorkerOrchestrator } from "@/lib/flyio/orchestrator";
import { addCredits } from "@/lib/billing/credits";
import { prisma } from "@/lib/db";
import { verifyCronSecret } from "@/lib/auth/verify-cron-secret";

export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  const orchestrator = new WorkerOrchestrator();

  // 1. 건강 체크
  const health = await orchestrator.healthCheck();

  // 2. warm 풀 관리
  const pool = await orchestrator.maintainWarmPool();

  // 3. 실패/취소된 hosted 작업 크레딧 환불
  // status가 "failed" 또는 "cancelled"이고 mode="hosted"이고 creditsUsed > 0이고 아직 환불 안 된 작업
  // 환불 여부는 CreditTransaction에 해당 taskId의 "refund" 타입이 있는지로 판단
  const refundable = await prisma.agentTask.findMany({
    where: {
      mode: "hosted",
      status: { in: ["failed", "cancelled", "timed_out"] },
      creditsUsed: { gt: 0 },
      useOwnApiKey: false,
    },
    take: 50,
  });

  let refundCount = 0;
  for (const task of refundable) {
    const alreadyRefunded = await prisma.creditTransaction.findFirst({
      where: { taskId: task.id, type: "refund" },
    });
    if (!alreadyRefunded && task.creditsUsed) {
      await addCredits(task.organizationId, task.creditsUsed, {
        type: "refund",
        description: `작업 실패 환불: ${task.id}`,
      });
      // creditsUsed를 0으로 변경하여 중복 환불 방지
      await prisma.agentTask.update({
        where: { id: task.id },
        data: { creditsUsed: 0 },
      });
      refundCount++;
    }
  }

  return NextResponse.json({
    health,
    pool,
    refundCount,
  });
}
