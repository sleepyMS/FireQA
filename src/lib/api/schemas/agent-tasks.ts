import { z } from "zod";

// POST /api/agent/tasks/[id]/output — 에이전트 로그 청크 전송
export const postAgentOutputSchema = z.object({
  chunks: z
    .array(
      z.object({
        type: z.string(),
        content: z.string(),
        tool: z.string().optional(),
      }).passthrough(),
    )
    .min(1, "chunks 배열이 필요합니다."),
});
export type PostAgentOutputBody = z.infer<typeof postAgentOutputSchema>;
