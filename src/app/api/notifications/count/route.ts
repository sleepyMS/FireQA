import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "api/notifications/count" });

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const count = await prisma.notification.count({
      where: { userId: user.userId, organizationId: user.organizationId, isRead: false },
    });

    return NextResponse.json({ count });
  } catch (error) {
    logger.error("알림 카운트 조회 오류", { error });
    return NextResponse.json({ error: "알림 카운트 조회에 실패했습니다." }, { status: 500 });
  }
}
