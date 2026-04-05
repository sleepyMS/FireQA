import { z } from "zod";

// POST /api/test-runs — 새 테스트 실행 시작
export const createTestRunSchema = z.object({
  generationJobId: z.string().cuid("유효한 Job ID가 필요합니다."),
});

export type CreateTestRunBody = z.infer<typeof createTestRunSchema>;

// PATCH /api/test-runs/[id] — 상태 변경
export const updateTestRunSchema = z.object({
  status: z.enum(["completed", "aborted"], {
    message: "상태는 completed 또는 aborted만 가능합니다.",
  }),
});

export type UpdateTestRunBody = z.infer<typeof updateTestRunSchema>;

// GET /api/test-runs — 목록 쿼리
export const listTestRunsQuerySchema = z.object({
  projectId: z.string().cuid().optional(),
  status: z.enum(["in_progress", "completed", "aborted"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["startedAt", "createdAt"]).default("startedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type ListTestRunsQuery = z.infer<typeof listTestRunsQuerySchema>;

// PATCH /api/test-executions/[id] — TC 결과 업데이트
export const updateTestExecutionSchema = z.object({
  status: z.enum(["pending", "passed", "failed", "skipped", "blocked"], {
    message: "유효한 상태가 아닙니다.",
  }),
  note: z
    .string()
    .max(500, "메모는 500자 이하여야 합니다.")
    .optional()
    .nullable(),
});

export type UpdateTestExecutionBody = z.infer<
  typeof updateTestExecutionSchema
>;
