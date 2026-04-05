import { z } from "zod";

// ─── TC 데이터 구조 ───

const testCaseSchema = z.object({
  tcId: z.string().min(1),
  name: z.string().min(1, "테스트케이스 명은 필수입니다."),
  depth1: z.string(),
  depth2: z.string(),
  depth3: z.string(),
  precondition: z.string(),
  procedure: z.string(),
  expectedResult: z.string(),
});

const testSheetSchema = z.object({
  sheetName: z.string().min(1),
  category: z.string().optional(),
  testCases: z.array(testCaseSchema),
});

// PUT /api/test-cases/[jobId]
export const updateTestCasesSchema = z.object({
  sheets: z.array(testSheetSchema).min(1, "최소 1개 시트가 필요합니다."),
  changeSummary: z.string().max(500).optional(),
});

export type UpdateTestCasesBody = z.infer<typeof updateTestCasesSchema>;
