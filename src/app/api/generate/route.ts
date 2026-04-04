import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createGenerationJob, completeJob, failJob } from "@/lib/api/create-generation-job";
import { checkRateLimit } from "@/lib/rate-limit/check-rate-limit";
import { logActivity } from "@/lib/activity/log-activity";
import { JobType, ActivityAction } from "@/types/enums";
import { Stage } from "@/types/sse";
import { createSSEStream, sendStage } from "@/lib/sse/create-sse-stream";
import { streamOpenAIChunked } from "@/lib/sse/stream-openai-chunked-tc";
import { resolveProvider } from "@/lib/ai/resolve-provider";
import { buildTestCaseUserPrompt } from "@/lib/openai/prompts/test-case-system";
import { resolveSystemPrompt } from "@/lib/openai/prompts/resolve-prompt";
import { testCaseJsonSchema } from "@/lib/openai/schemas/test-case";
import { splitDocument } from "@/lib/text/split-document";
import type { TestCaseGenerationResult } from "@/types/test-case";

// Vercel 서버리스 타임아웃 확장 (5분)
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const projectId = formData.get("projectId") as string | null;
  const projectName = formData.get("projectName") as string | null;
  const templateId = formData.get("templateId") as string | null;
  const providerParam = formData.get("provider") as string | null;

  // projectId 또는 projectName 중 하나는 반드시 필요
  if (!file || (!projectId && !projectName)) {
    return NextResponse.json(
      { error: "파일과 프로젝트 이름이 필요합니다." },
      { status: 400 }
    );
  }

  // projectId 우선; 없으면 projectName으로 새 프로젝트 생성
  const projectInput = projectId ? { id: projectId } : (projectName as string);

  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { limited, resetAt } = await checkRateLimit(user.organizationId);
  if (limited) {
    return NextResponse.json(
      { error: `시간당 생성 한도를 초과했습니다. ${resetAt.toISOString()} 이후 다시 시도하세요.` },
      { status: 429, headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": resetAt.toISOString() } }
    );
  }

  const STAGE_TOTAL = 4; // parsing → preparing → generating → saving

  return createSSEStream(async (writer) => {
    sendStage(writer, { stage: Stage.PARSING, message: "문서를 파싱하고 있습니다...", progress: 10, stageIndex: 1, stageTotal: STAGE_TOTAL });

    let template: Awaited<ReturnType<typeof prisma.qATemplate.findUnique>> = null;
    if (templateId) {
      template = await prisma.qATemplate.findUnique({
        where: { id: templateId },
      });
    }

    const { jobId, parsedText } = await createGenerationJob(file, projectInput, JobType.TEST_CASES, {
      userId: user.userId,
      organizationId: user.organizationId,
    });
    writer.send({ type: "job_created", jobId });

    try {
      sendStage(writer, { stage: Stage.PREPARING, message: "프롬프트를 준비하고 있습니다...", progress: 25, stageIndex: 2, stageTotal: STAGE_TOTAL });

      const systemPrompt = resolveSystemPrompt(JobType.TEST_CASES, template);

      const chunks = splitDocument(parsedText);

      sendStage(writer, {
        stage: Stage.GENERATING,
        message: chunks.length > 1
          ? `AI가 TC를 생성하고 있습니다... (${chunks.length}개 청크)`
          : "AI가 TC를 생성하고 있습니다...",
        progress: 40, stageIndex: 3, stageTotal: STAGE_TOTAL,
      });

      const aiProvider = await resolveProvider(user.organizationId, providerParam);

      let result: TestCaseGenerationResult;
      let tokenUsage: number;

      if (chunks.length === 1) {
        const res = await aiProvider.streamWithSchema<TestCaseGenerationResult>({
          systemPrompt,
          userPrompt: buildTestCaseUserPrompt(parsedText),
          jsonSchema: testCaseJsonSchema,
          writer,
          signal: request.signal,
          progressRange: { min: 40, max: 90 },
        });
        result = res.result;
        tokenUsage = res.tokenUsage;
      } else {
        const res = await streamOpenAIChunked({
          chunks,
          systemPrompt,
          buildUserPrompt: buildTestCaseUserPrompt,
          jsonSchema: testCaseJsonSchema,
          writer,
          signal: request.signal,
        });
        result = res.result;
        tokenUsage = res.totalTokens;
      }

      sendStage(writer, { stage: Stage.SAVING, message: "결과를 저장하고 있습니다...", progress: 95, stageIndex: 4, stageTotal: STAGE_TOTAL });
      await completeJob(jobId, result, tokenUsage, user.userId);
      logActivity({ organizationId: user.organizationId, actorId: user.userId, action: ActivityAction.GENERATION_COMPLETED, jobId, metadata: { type: "test-cases" } });

      writer.send({ type: "complete", data: result, tokenUsage });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "TC 생성에 실패했습니다.";
      try { await failJob(jobId, err); } catch { /* DB 에러 무시 */ }
      logActivity({ organizationId: user.organizationId, actorId: user.userId, action: ActivityAction.GENERATION_FAILED, jobId, metadata: { type: "test-cases", error: errMsg } });
      writer.send({ type: "error", message: errMsg });
    }

    writer.close();
  }, request.signal);
}

