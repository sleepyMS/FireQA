import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { checkCreditThreshold } from "./credit-alert";

type CreditResult =
  | { success: true; balanceAfter: number }
  | { success: false; reason: string };

/**
 * 크레딧 원자적 차감.
 * FOR UPDATE 잠금으로 동시성 안전하게 차감한다.
 */
export async function deductCredits(
  organizationId: string,
  amount: number,
  opts: { type: string; taskId?: string; description?: string },
): Promise<CreditResult> {
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // FOR UPDATE 잠금으로 잔액 조회
    const rows = await tx.$queryRaw<
      { id: string; balance: number }[]
    >`SELECT id, balance FROM "CreditBalance" WHERE "organizationId" = ${organizationId} FOR UPDATE`;

    if (rows.length === 0) {
      return { success: false as const, reason: "크레딧 잔액 정보가 없습니다" };
    }

    const current = rows[0];
    if (current.balance < amount) {
      return { success: false as const, reason: "크레딧이 부족합니다" };
    }

    const newBalance = current.balance - amount;

    await tx.creditBalance.update({
      where: { id: current.id },
      data: { balance: newBalance },
    });

    await tx.creditTransaction.create({
      data: {
        organizationId,
        amount: -amount,
        type: opts.type,
        taskId: opts.taskId ?? null,
        description: opts.description ?? null,
        balanceAfter: newBalance,
      },
    });

    return { success: true as const, balanceAfter: newBalance };
  });

  // fire-and-forget: 크레딧 임계치 알림
  if (result.success) {
    const quota = await prisma.creditBalance.findUnique({
      where: { organizationId },
      select: { monthlyQuota: true },
    });
    checkCreditThreshold(organizationId, result.balanceAfter, quota?.monthlyQuota ?? 0).catch(() => {});
  }

  return result;
}

/**
 * 크레딧 충전.
 * CreditBalance 업데이트 + CreditTransaction 생성.
 */
export async function addCredits(
  organizationId: string,
  amount: number,
  opts: { type: string; description?: string },
): Promise<{ balanceAfter: number }> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const balance = await tx.creditBalance.upsert({
      where: { organizationId },
      create: { organizationId, balance: amount, monthlyQuota: 0 },
      update: { balance: { increment: amount } },
    });

    await tx.creditTransaction.create({
      data: {
        organizationId,
        amount,
        type: opts.type,
        description: opts.description ?? null,
        balanceAfter: balance.balance,
      },
    });

    return { balanceAfter: balance.balance };
  });
}

/**
 * 조직의 현재 크레딧 잔액 조회.
 * CreditBalance 레코드가 없으면 기본값 반환.
 */
export async function getCredits(organizationId: string): Promise<{
  balance: number;
  monthlyQuota: number;
  quotaResetAt: Date | null;
}> {
  const record = await prisma.creditBalance.findUnique({
    where: { organizationId },
  });

  if (!record) {
    return { balance: 0, monthlyQuota: 0, quotaResetAt: null };
  }

  return {
    balance: record.balance,
    monthlyQuota: record.monthlyQuota,
    quotaResetAt: record.quotaResetAt,
  };
}

/**
 * 잔액이 충분한지 확인.
 */
export async function hasEnoughCredits(
  organizationId: string,
  amount: number,
): Promise<boolean> {
  const { balance } = await getCredits(organizationId);
  return balance >= amount;
}

/**
 * 월간 크레딧 리셋.
 * balance를 monthlyQuota로 리셋하고 "monthly_reset" 트랜잭션을 기록한다.
 */
export async function resetMonthlyCredits(
  organizationId: string,
): Promise<{ balanceAfter: number }> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const current = await tx.creditBalance.findUnique({
      where: { organizationId },
    });

    if (!current) {
      throw new Error("크레딧 잔액 정보가 없습니다");
    }

    const newBalance = current.monthlyQuota;

    await tx.creditBalance.update({
      where: { organizationId },
      data: {
        balance: newBalance,
        quotaResetAt: new Date(),
      },
    });

    await tx.creditTransaction.create({
      data: {
        organizationId,
        amount: newBalance - current.balance,
        type: "monthly_reset",
        description: `월간 크레딧 리셋 (${current.balance} → ${newBalance})`,
        balanceAfter: newBalance,
      },
    });

    return { balanceAfter: newBalance };
  });
}
