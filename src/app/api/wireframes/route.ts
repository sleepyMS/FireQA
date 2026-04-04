import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createGenerationJob, completeJob, failJob } from "@/lib/api/create-generation-job";
import { checkRateLimit } from "@/lib/rate-limit/check-rate-limit";
import { logActivity } from "@/lib/activity/log-activity";
import { JobType, ActivityAction } from "@/types/enums";
import { Stage } from "@/types/sse";
import { createSSEStream, sendStage } from "@/lib/sse/create-sse-stream";
import { streamOpenAIWithSchema } from "@/lib/sse/stream-openai";
import { wireframeJsonSchema } from "@/lib/openai/schemas/wireframe";
import {
  WIREFRAME_SYSTEM_PROMPT,
  buildWireframeUserPrompt,
} from "@/lib/openai/prompts/wireframe-system";

// Vercel 서버리스 타임아웃 확장 (5분)
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const projectId = formData.get("projectId") as string | null;
  const projectName = formData.get("projectName") as string | null;
  const screenTypeMode = (formData.get("screenTypeMode") as string) || "auto";

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

    const { jobId, parsedText } = await createGenerationJob(file, projectInput, JobType.WIREFRAMES, {
      userId: user.userId,
      organizationId: user.organizationId,
    });
    writer.send({ type: "job_created", jobId });

    try {
      sendStage(writer, { stage: Stage.PREPARING, message: "프롬프트를 준비하고 있습니다...", progress: 25, stageIndex: 2, stageTotal: STAGE_TOTAL });

      let input = parsedText;
      if (input.length > 60000) input = input.slice(0, 60000);

      sendStage(writer, { stage: Stage.GENERATING, message: "AI가 와이어프레임을 생성하고 있습니다...", progress: 40, stageIndex: 3, stageTotal: STAGE_TOTAL });

      const { result, tokenUsage } = await streamOpenAIWithSchema({
        systemPrompt: WIREFRAME_SYSTEM_PROMPT,
        userPrompt: buildWireframeUserPrompt(input, screenTypeMode),
        jsonSchema: wireframeJsonSchema,
        writer,
        signal: request.signal,
        progressRange: { min: 40, max: 90 },
      });

      sendStage(writer, { stage: Stage.SAVING, message: "결과를 저장하고 있습니다...", progress: 95, stageIndex: 4, stageTotal: STAGE_TOTAL });
      await completeJob(jobId, result, tokenUsage, user.userId);
      logActivity({ organizationId: user.organizationId, actorId: user.userId, action: ActivityAction.GENERATION_COMPLETED, jobId, metadata: { type: "wireframes" } });

      writer.send({ type: "complete", data: result, tokenUsage });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "와이어프레임 생성에 실패했습니다.";
      try { await failJob(jobId, err); } catch { /* DB 에러 무시 */ }
      logActivity({ organizationId: user.organizationId, actorId: user.userId, action: ActivityAction.GENERATION_FAILED, jobId, metadata: { type: "wireframes", error: errMsg } });
      writer.send({ type: "error", message: errMsg });
    }

    writer.close();
  }, request.signal);
}
