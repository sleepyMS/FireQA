import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications/create-notification";
import { NotificationType, UserRole } from "@/types/enums";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "credit-alert" });

/**
 * 크레딧 잔액이 임계치 이하로 떨어지면 조직의 OWNER/ADMIN에게 알림을 생성한다.
 * - 잔액 <= monthlyQuota * 0.2 → CREDIT_LOW
 * - 잔액 <= 0 → CREDIT_DEPLETED
 * 동일 타입 알림이 24시간 내에 이미 존재하면 중복 발송하지 않는다.
 */
export async function checkCreditThreshold(
  organizationId: string,
  balanceAfter: number,
  monthlyQuota: number,
): Promise<void> {
  try {
    let type: string;
    let title: string;

    if (balanceAfter <= 0) {
      type = NotificationType.CREDIT_DEPLETED;
      title = "크레딧이 모두 소진되었습니다. 충전이 필요합니다.";
    } else if (monthlyQuota > 0 && balanceAfter <= monthlyQuota * 0.2) {
      type = NotificationType.CREDIT_LOW;
      title = `크레딧 잔액이 ${Math.round((balanceAfter / monthlyQuota) * 100)}% 이하입니다.`;
    } else {
      return;
    }

    // 24시간 내 동일 타입 알림 중복 확인
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await prisma.notification.findFirst({
      where: {
        organizationId,
        type,
        createdAt: { gte: since },
      },
    });

    if (existing) return;

    // 조직의 OWNER/ADMIN 멤버 조회
    const admins = await prisma.organizationMembership.findMany({
      where: {
        organizationId,
        role: { in: [UserRole.OWNER, UserRole.ADMIN] },
      },
      select: { userId: true },
    });

    for (const admin of admins) {
      createNotification({
        userId: admin.userId,
        organizationId,
        type,
        title,
        linkUrl: "/settings?tab=credits",
        metadata: { balanceAfter, monthlyQuota },
      });
    }
  } catch (err) {
    logger.error("크레딧 임계치 알림 확인 실패", { error: err });
  }
}
