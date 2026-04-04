import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "api/comments/resolve" });

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/comments/[id]/resolve — 해결/미해결 토글
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      return NextResponse.json({ error: "코멘트를 찾을 수 없습니다." }, { status: 404 });
    }

    // 삭제된 코멘트는 해결 처리 불가
    if (comment.deletedAt !== null) {
      return NextResponse.json({ error: "삭제된 코멘트는 해결 처리할 수 없습니다." }, { status: 400 });
    }

    // 조직 범위 확인
    if (comment.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "코멘트를 찾을 수 없습니다." }, { status: 404 });
    }

    // 해결 상태 토글
    const updated = await prisma.comment.update({
      where: { id },
      data: comment.isResolved
        ? { isResolved: false, resolvedById: null, resolvedAt: null }
        : { isResolved: true, resolvedById: user.userId, resolvedAt: new Date() },
    });

    return NextResponse.json({
      id: updated.id,
      authorId: updated.authorId,
      body: updated.body,
      targetItemId: updated.targetItemId,
      parentId: updated.parentId,
      isResolved: updated.isResolved,
      resolvedById: updated.resolvedById,
      resolvedAt: updated.resolvedAt?.toISOString() ?? null,
      editedAt: updated.editedAt?.toISOString() ?? null,
      deletedAt: updated.deletedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    logger.error("코멘트 해결 처리 오류", { error });
    return NextResponse.json({ error: "코멘트 해결 처리에 실패했습니다." }, { status: 500 });
  }
}
