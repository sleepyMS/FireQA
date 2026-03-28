import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";

// GET /api/activity — 조직 활동 로그 목록 (커서 페이지네이션)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;

    const limitParam = parseInt(searchParams.get("limit") || "50", 10);
    const limit = isNaN(limitParam) || limitParam < 1 ? 50 : Math.min(limitParam, 100);
    const cursor = searchParams.get("cursor") || "";

    // 커서 파싱: "ISO날짜_cuid" 형식
    let cursorDate: Date | undefined;
    let cursorId: string | undefined;
    if (cursor) {
      const underscoreIdx = cursor.indexOf("_");
      if (underscoreIdx === -1) {
        return NextResponse.json({ error: "잘못된 cursor 형식입니다." }, { status: 400 });
      }
      cursorDate = new Date(cursor.slice(0, underscoreIdx));
      cursorId = cursor.slice(underscoreIdx + 1);
      if (isNaN(cursorDate.getTime()) || !cursorId) {
        return NextResponse.json({ error: "잘못된 cursor 형식입니다." }, { status: 400 });
      }
    }

    const where = {
      organizationId: user.organizationId,
      ...(cursorDate && cursorId
        ? {
            OR: [
              { createdAt: { lt: cursorDate } },
              { createdAt: cursorDate, id: { lt: cursorId } },
            ],
          }
        : {}),
    };

    const items = await prisma.activityLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });

    const hasMore = items.length > limit;
    if (hasMore) items.pop();

    const nextCursor = hasMore
      ? `${items[items.length - 1].createdAt.toISOString()}_${items[items.length - 1].id}`
      : null;

    return NextResponse.json({
      logs: items.map((log) => ({
        id: log.id,
        action: log.action,
        actorId: log.actorId,
        projectId: log.projectId,
        jobId: log.jobId,
        metadata: JSON.parse(log.metadata) as Record<string, unknown>,
        createdAt: log.createdAt.toISOString(),
      })),
      nextCursor,
    });
  } catch (error) {
    console.error("활동 로그 조회 오류:", error);
    return NextResponse.json({ error: "활동 로그 조회에 실패했습니다." }, { status: 500 });
  }
}
