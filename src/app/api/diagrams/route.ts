import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createGenerationJob, completeJob, failJob } from "@/lib/api/create-generation-job";
import { JobType } from "@/types/enums";
import { Stage } from "@/types/sse";
import { createSSEStream } from "@/lib/sse/create-sse-stream";
import { streamOpenAIWithSchema } from "@/lib/sse/stream-openai";
import {
  DIAGRAM_SYSTEM_PROMPT,
  buildDiagramUserPrompt,
} from "@/lib/openai/prompts/diagram-system";
import { diagramJsonSchema } from "@/lib/openai/schemas/diagram";
import type { DiagramGenerationResult } from "@/types/diagram";
import { sanitizeMermaid } from "@/lib/mermaid/sanitize";
import { estimateTokens } from "@/lib/text/split-document";

// Vercel 서버리스 타임아웃 확장 (5분)
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const projectName = formData.get("projectName") as string;

  if (!file || !projectName) {
    return NextResponse.json(
      { error: "파일과 프로젝트 이름이 필요합니다." },
      { status: 400 }
    );
  }

  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  return createSSEStream(async (writer) => {
    writer.send({ type: "stage", stage: Stage.PARSING, message: "문서를 파싱하고 있습니다...", progress: 10 });

    const { jobId, parsedText } = await createGenerationJob(file, projectName, JobType.DIAGRAMS, {
      userId: user.userId,
      organizationId: user.organizationId,
    });
    writer.send({ type: "job_created", jobId });

    try {
      let input = parsedText;
      if (estimateTokens(parsedText) > 100000) {
        input = parsedText.slice(0, 60000);
      }

      writer.send({ type: "stage", stage: Stage.GENERATING, message: "AI가 다이어그램을 생성하고 있습니다...", progress: 30 });

      const { result: raw, tokenUsage } = await streamOpenAIWithSchema<DiagramGenerationResult>({
        systemPrompt: DIAGRAM_SYSTEM_PROMPT,
        userPrompt: buildDiagramUserPrompt(input),
        jsonSchema: diagramJsonSchema,
        writer,
        signal: request.signal,
      });

      writer.send({ type: "stage", stage: Stage.SANITIZING, message: "다이어그램을 정리하고 있습니다...", progress: 85 });

      // Mermaid 코드 후처리
      const result: DiagramGenerationResult = {
        diagrams: raw.diagrams.map((d) => ({
          ...d,
          mermaidCode: sanitizeMermaid(d.mermaidCode),
        })),
      };

      writer.send({ type: "stage", stage: Stage.SAVING, message: "결과를 저장하고 있습니다...", progress: 95 });
      await completeJob(jobId, result, tokenUsage);

      writer.send({ type: "complete", data: result, tokenUsage });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "다이어그램 생성에 실패했습니다.";
      try { await failJob(jobId, err); } catch { /* DB 에러 무시 */ }
      writer.send({ type: "error", message: errMsg });
    }

    writer.close();
  }, request.signal);
}
