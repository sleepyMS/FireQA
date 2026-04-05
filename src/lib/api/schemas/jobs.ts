import { z } from "zod";

// GET /api/jobs �� Job 목록 조회
export const getJobsQuerySchema = z.object({
  type: z.string().optional(),
  all: z.string().optional(),
  cursor: z.string().optional(),
  projectId: z.string().optional(),
});
export type GetJobsQuery = z.infer<typeof getJobsQuerySchema>;

// PATCH /api/jobs — 프로젝트명 수정
export const patchJobSchema = z.object({
  id: z.string().min(1, "ID는 필수입니다."),
  projectName: z.string().min(1, "프로젝트명은 필수입니다."),
});
export type PatchJobBody = z.infer<typeof patchJobSchema>;

// DELETE /api/jobs — Job 삭제
export const deleteJobSchema = z.object({
  id: z.string().min(1, "ID는 필수입니다."),
});
export type DeleteJobBody = z.infer<typeof deleteJobSchema>;
