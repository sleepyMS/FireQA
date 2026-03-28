import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { requireRole } from "@/lib/auth/require-role";
import { UserRole } from "@/types/enums";

type RouteContext = { params: Promise<{ id: string }> };

const MAX_BODY_LENGTH = 10_000;

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment || comment.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "코멘트를 찾을 수 없습니다." }, { status: 404 });
    }
    if (comment.authorId !== user.userId) {
      return NextResponse.json({ error: "코멘트를 수정할 권한이 없습니다." }, { status: 403 });
    }
    if (comment.deletedAt !== null) {
      return NextResponse.json({ error: "삭제된 코멘트는 수정할 수 없습니다." }, { status: 400 });
    }

    const body = await request.json() as { body?: string };
    const trimmed = body.body?.trim() ?? "";
    if (!trimmed) {
      return NextResponse.json({ error: "내용(body)을 입력해주세요." }, { status: 400 });
    }
    if (trimmed.length > MAX_BODY_LENGTH) {
      return NextResponse.json({ error: "내용이 너무 깁니다. (최대 10,000자)" }, { status: 400 });
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: { body: trimmed, editedAt: new Date() },
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
    console.error("코멘트 수정 오류:", error);
    return NextResponse.json({ error: "코멘트 수정에 실패했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment || comment.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "코멘트를 찾을 수 없습니다." }, { status: 404 });
    }

    const isAuthor = comment.authorId === user.userId;
    if (!isAuthor) {
      const roleErr = requireRole(user.role, UserRole.ADMIN);
      if (roleErr) {
        return NextResponse.json({ error: roleErr.error }, { status: roleErr.status });
      }
    }

    await prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("코멘트 삭제 오류:", error);
    return NextResponse.json({ error: "코멘트 삭제에 실패했습니다." }, { status: 500 });
  }
}
