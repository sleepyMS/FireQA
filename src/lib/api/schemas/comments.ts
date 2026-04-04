import { z } from "zod";

const MAX_BODY_LENGTH = 10_000;

// GET /api/comments
export const getCommentsSchema = z.object({
  jobId: z.string().min(1, "jobId가 필요합니다."),
});

export type GetCommentsQuery = z.infer<typeof getCommentsSchema>;

// POST /api/comments
export const createCommentSchema = z.object({
  jobId: z.string().min(1, "jobId가 필요합니다."),
  body: z.string().min(1, "내용(body)을 입력해주세요.").max(MAX_BODY_LENGTH, "내용이 너무 깁니다. (최대 10,000자)"),
  targetItemId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
});

export type CreateCommentBody = z.infer<typeof createCommentSchema>;
