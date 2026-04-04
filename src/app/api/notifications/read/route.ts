import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "api/notifications/read" });

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    await prisma.notification.updateMany({
      where: { userId: user.userId, organizationId: user.organizationId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("알림 읽음 처리 오류", { error });
    return NextResponse.json({ error: "알림 읽음 처리에 실패했습니다." }, { status: 500 });
  }
}
