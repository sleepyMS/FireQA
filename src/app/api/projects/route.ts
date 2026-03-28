import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";

// GET /api/projects — 조직 프로젝트 목록 (커서 페이지네이션)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;

    // status 허용값 검증
    const VALID_STATUSES = ["active", "archived", "deleted"] as const;
    const statusParam = (searchParams.get("status") || "active") as string;
    if (!VALID_STATUSES.includes(statusParam as typeof VALID_STATUSES[number])) {
      return NextResponse.json({ error: "올바르지 않은 status 값입니다." }, { status: 400 });
    }

    const search = searchParams.get("search") || "";
    const limitParam = parseInt(searchParams.get("limit") || "20", 10);
    const limit = isNaN(limitParam) || limitParam < 1 ? 20 : Math.min(limitParam, 100);
    const cursor = searchParams.get("cursor") || "";

    // 커서 파싱: "ISO날짜_cuid" 형식 (잘못된 형식은 400 반환)
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
      status: statusParam,
      // deleted 상태 조회 시 deletedAt이 있는 레코드만, 그 외는 deletedAt=null만
      ...(statusParam !== "deleted"
        ? { deletedAt: null }
        : { deletedAt: { not: null } }),
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
      ...(cursorDate && cursorId
        ? {
            OR: [
              { createdAt: { lt: cursorDate } },
              { createdAt: cursorDate, id: { lt: cursorId } },
            ],
          }
        : {}),
    };

    const items = await prisma.project.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: { _count: { select: { jobs: true, uploads: true } } },
    });

    const hasMore = items.length > limit;
    if (hasMore) items.pop();

    const nextCursor = hasMore
      ? `${items[items.length - 1].createdAt.toISOString()}_${items[items.length - 1].id}`
      : null;

    return NextResponse.json({
      projects: items.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        archivedAt: p.archivedAt,
        _count: p._count,
      })),
      nextCursor,
    });
  } catch (error) {
    console.error("프로젝트 목록 조회 오류:", error);
    return NextResponse.json({ error: "목록 조회에 실패했습니다." }, { status: 500 });
  }
}

// POST /api/projects — 프로젝트 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body as { name?: string; description?: string };

    if (!name?.trim()) {
      return NextResponse.json({ error: "프로젝트 이름은 필수입니다." }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        organizationId: user.organizationId,
        createdById: user.userId,
      },
    });

    return NextResponse.json(
      {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        createdAt: project.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("프로젝트 생성 오류:", error);
    return NextResponse.json({ error: "프로젝트 생성에 실패했습니다." }, { status: 500 });
  }
}
