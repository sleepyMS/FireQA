import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getCredits } from "@/lib/billing/credits";

// GET — 크레딧 잔액 + 최근 트랜잭션 이력 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { balance, monthlyQuota, quotaResetAt } = await getCredits(
      user.organizationId,
    );

    const transactions = await prisma.creditTransaction.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        amount: true,
        type: true,
        description: true,
        balanceAfter: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      balance,
      monthlyQuota,
      quotaResetAt,
      transactions,
    });
  } catch (error) {
    console.error("크레딧 조회 오류:", error);
    return NextResponse.json({ error: "크레딧 조회에 실패했습니다." }, { status: 500 });
  }
}
