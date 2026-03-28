import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";

// GET /api/comments?jobId=xxx — jobId 기준 최상위 코멘트 + 답글 목록
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

    // 최상위 코멘트 (parentId IS NULL) + 비삭제 답글 포함, 생성일 오름차순
    const comments = await prisma.comment.findMany({
      where: {
        jobId,
        parentId: null,
        deletedAt: null,
      },
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
          isResolved: r.isResolved,
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

// POST /api/comments — 코멘트 생성
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
    if (!commentBody || !commentBody.trim()) {
      return NextResponse.json({ error: "내용(body)을 입력해주세요." }, { status: 400 });
    }

    // job이 해당 조직 소속인지 확인
    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
      include: { project: { select: { organizationId: true } } },
    });

    if (!job || job.project.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
    }

    // parentId가 있으면 부모 코멘트 검증
    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parent || parent.jobId !== jobId) {
        return NextResponse.json({ error: "부모 코멘트를 찾을 수 없습니다." }, { status: 404 });
      }
      // 2단계 이상 중첩 불가: 부모 자체가 답글이면 안 됨
      if (parent.parentId !== null) {
        return NextResponse.json({ error: "답글에는 답글을 달 수 없습니다." }, { status: 400 });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        organizationId: user.organizationId,
        authorId: user.userId,
        jobId,
        body: commentBody.trim(),
        targetItemId: targetItemId ?? null,
        parentId: parentId ?? null,
      },
    });

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
