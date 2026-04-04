import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications/create-notification";
import { NotificationType } from "@/types/enums";
import { sendEmail } from "@/lib/email/brevo";
import { commentReplyEmailHtml } from "@/lib/email/templates/comment-reply";
import { commentMentionEmailHtml } from "@/lib/email/templates/comment-mention";
import { parseMentions } from "@/lib/comments/parse-mentions";
import {
  withApiHandler,
  ApiError,
  ApiErrorCode,
  getCommentsSchema,
  createCommentSchema,
  type GetCommentsQuery,
  type CreateCommentBody,
} from "@/lib/api";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "api/comments" });

// GET /api/comments
export const GET = withApiHandler<unknown, GetCommentsQuery>(
  async ({ user, query }) => {
    const { jobId } = query;

    const commentSelect = {
      id: true,
      authorId: true,
      body: true,
      targetItemId: true,
      isResolved: true,
      resolvedById: true,
      resolvedAt: true,
      editedAt: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
    } as const;

    const comments = await prisma.comment.findMany({
      where: {
        jobId,
        organizationId: user.organizationId,
        parentId: null,
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
      select: {
        ...commentSelect,
        replies: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          take: 100,
          select: commentSelect,
        },
      },
    });

    type CommentRow = typeof comments[number]["replies"][number];
    const formatComment = (c: CommentRow) => ({
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
    });

    return {
      comments: comments.map((c) => ({
        ...formatComment(c),
        replies: c.replies.map(formatComment),
      })),
    };
  },
  { querySchema: getCommentsSchema },
);

// POST /api/comments
export const POST = withApiHandler<CreateCommentBody>(
  async ({ user, body }) => {
    const { jobId, body: commentBody, targetItemId, parentId } = body;
    const trimmed = commentBody.trim();

    // job 소속 검증 + 부모 코멘트 조회를 병렬로
    const [job, parentComment] = await Promise.all([
      prisma.generationJob.findUnique({
        where: { id: jobId },
        select: { id: true, project: { select: { organizationId: true } } },
      }),
      parentId
        ? prisma.comment.findUnique({
            where: { id: parentId },
            select: { authorId: true, jobId: true, parentId: true },
          })
        : Promise.resolve(null),
    ]);

    if (!job || job.project.organizationId !== user.organizationId) {
      throw ApiError.notFound("작업");
    }

    if (parentId) {
      if (!parentComment || parentComment.jobId !== jobId) {
        throw ApiError.notFound("부모 코멘트");
      }
      // 2단계 이상 중첩 불가 — 부모 자체가 답글이면 거부
      if (parentComment.parentId !== null) {
        throw new ApiError({
          code: ApiErrorCode.INVALID_REQUEST,
          message: "답글에는 답글을 달 수 없습니다.",
        });
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
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      const linkUrl = `${appUrl}/generate/${jobId}`;

      createNotification({
        userId: parentComment.authorId,
        organizationId: user.organizationId,
        type: NotificationType.COMMENT_REPLY,
        title: "새 답글이 달렸습니다",
        linkUrl,
      });

      // Brevo 이메일 알림
      Promise.all([
        prisma.user.findUnique({
          where: { id: parentComment.authorId },
          select: { email: true, name: true },
        }),
        prisma.user.findUnique({
          where: { id: user.userId },
          select: { name: true },
        }),
      ])
        .then(([author, replier]) => {
          if (!author) return;
          return sendEmail({
            to: { email: author.email, name: author.name ?? undefined },
            subject: "[FireQA] 새 답글이 달렸습니다",
            htmlContent: commentReplyEmailHtml({
              replierName: replier?.name ?? user.email,
              commentPreview: trimmed,
              linkUrl,
            }),
          });
        })
        .catch((err) => logger.error("답글 이메일 발송 오류", { error: err }));
    }

    // @멘션 알림 발송 (fire-and-forget)
    const mentionedNames = parseMentions(trimmed);
    if (mentionedNames.length > 0) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      const linkUrl = `${appUrl}/generate/${jobId}`;

      // 조직 내 멤버 중 멘션된 이름과 일치하는 사용자 조회
      prisma.organizationMembership
        .findMany({
          where: { organizationId: user.organizationId },
          select: { user: { select: { id: true, name: true, email: true } } },
        })
        .then(async (memberships) => {
          const mentioner = await prisma.user.findUnique({
            where: { id: user.userId },
            select: { name: true },
          });
          const mentionerName = mentioner?.name ?? user.email;

          for (const m of memberships) {
            const memberName = m.user.name ?? m.user.email;
            // 본인 제외, 이름이 멘션 목록에 있는 경우
            if (m.user.id === user.userId) continue;
            if (!mentionedNames.includes(memberName)) continue;
            // 답글 알림과 중복 방지: 이미 답글 알림을 받은 사용자 스킵
            if (parentComment && m.user.id === parentComment.authorId) continue;

            createNotification({
              userId: m.user.id,
              organizationId: user.organizationId,
              type: NotificationType.COMMENT_MENTION,
              title: `${mentionerName}님이 코멘트에서 멘션했습니다`,
              linkUrl,
            });

            sendEmail({
              to: { email: m.user.email, name: m.user.name ?? undefined },
              subject: "[FireQA] 코멘트에서 멘션되었습니다",
              htmlContent: commentMentionEmailHtml({
                mentionerName,
                commentPreview: trimmed,
                linkUrl,
              }),
            }).catch((err) => logger.error("멘션 이메일 발송 오류", { error: err }));
          }
        })
        .catch((err) => logger.error("멘션 알림 처리 오류", { error: err }));
    }

    return {
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
    };
  },
  { bodySchema: createCommentSchema, successStatus: 201 },
);
