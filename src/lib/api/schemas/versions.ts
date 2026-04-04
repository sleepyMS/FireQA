import { z } from "zod";

// GET /api/versions?jobId=xxx
export const getVersionsQuerySchema = z.object({
  jobId: z.string().min(1, "jobId가 필요합니다."),
});
export type GetVersionsQuery = z.infer<typeof getVersionsQuerySchema>;

// POST /api/versions — 수동 버전 생성
export const createVersionSchema = z.object({
  jobId: z.string().min(1),
  changeType: z.string().min(1),
  changeSummary: z.string().optional(),
  instruction: z.string().optional(),
  resultJson: z.string().min(1),
});
export type CreateVersionBody = z.infer<typeof createVersionSchema>;

// GET /api/versions/[id]/compare?targetId=xxx
export const compareVersionsQuerySchema = z.object({
  targetId: z.string().cuid("유효한 비교 대상 버전 ID가 필요합니다."),
});

export type CompareVersionsQuery = z.infer<typeof compareVersionsQuerySchema>;
