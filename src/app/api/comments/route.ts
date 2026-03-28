import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createNotification } from "@/lib/notifications/create-notification";

const MAX_BODY_LENGTH = 10_000;

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json({ error: "jobId가 필요합니다." }, { status: 400 });
    }

    const comments = await prisma.comment.findMany({
      where: { jobId, parentId: null, deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: {
        replies: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({
      comments: comments.map((c) => ({
        id: c.id,
        authorId: c.authorId,
        body: c.body,
        targetItemId: c.targetItemId,
        isResolved: c.isResolved,
        resolvedById: c.resolvedById,
        resolvedAt: c.resolvedAt?.toISOString() ?? null,
        editedAt: c.editedAt?.toISOString() ?? null,
        deletedAt: c.deletedAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        replies: c.replies.map((r) => ({
          id: r.id,
          authorId: r.authorId,
          body: r.body,
          targetItemId: r.targetItemId,
          isResolved: r.isResolved,
          resolvedById: r.resolvedById,
          resolvedAt: r.resolvedAt?.toISOString() ?? null,
          editedAt: r.editedAt?.toISOString() ?? null,
          deletedAt: r.deletedAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        })),
      })),
    });
  } catch (error) {
    console.error("코멘트 목록 조회 오류:", error);
    return NextResponse.json({ error: "코멘트 목록 조회에 실패했습니다." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json() as {
      jobId?: string;
      body?: string;
      targetItemId?: string;
      parentId?: string;
    };

    const { jobId, body: commentBody, targetItemId, parentId } = body;

    if (!jobId) {
      return NextResponse.json({ error: "jobId가 필요합니다." }, { status: 400 });
    }
    const trimmed = commentBody?.trim() ?? "";
    if (!trimmed) {
      return NextResponse.json({ error: "내용(body)을 입력해주세요." }, { status: 400 });
    }
    if (trimmed.length > MAX_BODY_LENGTH) {
      return NextResponse.json({ error: "내용이 너무 깁니다. (최대 10,000자)" }, { status: 400 });
    }

    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
      select: { id: true, project: { select: { organizationId: true } } },
    });

    if (!job || job.project.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
    }

    // parentComment은 답글 알림 트리거를 위해 블록 밖에서도 참조
    let parentComment: { authorId: string; jobId: string | null; parentId: string | null } | null = null;
    if (parentId) {
      parentComment = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parentComment || parentComment.jobId !== jobId) {
        return NextResponse.json({ error: "부모 코멘트를 찾을 수 없습니다." }, { status: 404 });
      }
      // 2단계 이상 중첩 불가 — 부모 자체가 답글이면 거부
      if (parentComment.parentId !== null) {
        return NextResponse.json({ error: "답글에는 답글을 달 수 없습니다." }, { status: 400 });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        organizationId: user.organizationId,
        authorId: user.userId,
        jobId,
        body: trimmed,
        targetItemId: targetItemId ?? null,
        parentId: parentId ?? null,
      },
    });

    // 답글이고 부모 작성자가 자기 자신이 아닌 경우 알림 발송 (fire-and-forget)
    if (parentId && parentComment && parentComment.authorId !== user.userId) {
      createNotification({
        userId: parentComment.authorId,
        organizationId: user.organizationId,
        type: "comment.reply",
        title: "새 답글이 달렸습니다",
        linkUrl: jobId ? `/generate/${jobId}` : undefined,
      });
    }

    return NextResponse.json(
      {
        id: comment.id,
        authorId: comment.authorId,
        body: comment.body,
        targetItemId: comment.targetItemId,
        parentId: comment.parentId,
        isResolved: comment.isResolved,
        resolvedById: comment.resolvedById,
        resolvedAt: comment.resolvedAt?.toISOString() ?? null,
        editedAt: comment.editedAt?.toISOString() ?? null,
        deletedAt: comment.deletedAt?.toISOString() ?? null,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("코멘트 생성 오류:", error);
    return NextResponse.json({ error: "코멘트 생성에 실패했습니다." }, { status: 500 });
  }
}
