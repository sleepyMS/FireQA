import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const includeRead = searchParams.get("all") === "1";

    const where = {
      userId: user.userId,
      organizationId: user.organizationId,
      ...(includeRead ? {} : { isRead: false }),
    };

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.notification.count({
        where: { userId: user.userId, organizationId: user.organizationId, isRead: false },
      }),
    ]);

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        linkUrl: n.linkUrl,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    });
  } catch (error) {
    console.error("알림 목록 조회 오류:", error);
    return NextResponse.json({ error: "알림 목록 조회에 실패했습니다." }, { status: 500 });
  }
}
