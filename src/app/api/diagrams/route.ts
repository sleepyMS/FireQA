import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createGenerationJob, completeJob, failJob } from "@/lib/api/create-generation-job";
import { handleAgentMode } from "@/lib/api/handle-agent-mode";
import { checkRateLimit } from "@/lib/rate-limit/check-rate-limit";
import { logActivity } from "@/lib/activity/log-activity";
import { createNotification } from "@/lib/notifications/create-notification";
import { JobType, ActivityAction, NotificationType } from "@/types/enums";
import { Stage } from "@/types/sse";
import { createSSEStream, sendStage } from "@/lib/sse/create-sse-stream";
import { resolveProvider } from "@/lib/ai/resolve-provider";
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
  const projectId = formData.get("projectId") as string | null;
  const projectName = formData.get("projectName") as string | null;
  const providerParam = (formData.get("model") ?? formData.get("provider")) as string | null;
  const executionMode = formData.get("executionMode") as string | null;
  const figmaFileKey = formData.get("figmaFileKey") as string | null;
  const agentModel = formData.get("agentModel") as string | null;
  const agentConnectionId = formData.get("agentConnectionId") as string | null;

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

  if (executionMode === "agent") {
    // 에이전트 모드 다이어그램은 Figma에 직접 그리는 것이 유일한 목적이므로
    // Figma 키가 없으면 작업 자체가 의미 없다. createGenerationJob 이전에 차단하여
    // 낭비되는 document parse·DB insert·rate-limit 슬롯·고아 Project/Upload를 막는다.
    if (!figmaFileKey) {
      return NextResponse.json(
        { error: "에이전트 모드 다이어그램 생성은 Figma 파일 키가 필수입니다." },
        { status: 400 }
      );
    }
    const { jobId, parsedText, projectId: pid } = await createGenerationJob(file, projectInput, JobType.DIAGRAMS, {
      userId: user.userId,
      organizationId: user.organizationId,
    });
    return handleAgentMode({
      jobId,
      projectId: pid,
      parsedText,
      jobType: JobType.DIAGRAMS,
      systemPrompt: DIAGRAM_SYSTEM_PROMPT,
      auth: { userId: user.userId, organizationId: user.organizationId },
      figmaFileKey: figmaFileKey || undefined,
      model: agentModel || undefined,
      agentConnectionId: agentConnectionId || undefined,
    });
  }

  const STAGE_TOTAL = 5; // parsing → preparing → generating → sanitizing → saving

  return createSSEStream(async (writer) => {
    sendStage(writer, { stage: Stage.PARSING, message: "문서를 파싱하고 있습니다...", progress: 10, stageIndex: 1, stageTotal: STAGE_TOTAL });

    const { jobId, parsedText } = await createGenerationJob(file, projectInput, JobType.DIAGRAMS, {
      userId: user.userId,
      organizationId: user.organizationId,
    });
    writer.send({ type: "job_created", jobId });

    try {
      sendStage(writer, { stage: Stage.PREPARING, message: "프롬프트를 준비하고 있습니다...", progress: 25, stageIndex: 2, stageTotal: STAGE_TOTAL });

      let input = parsedText;
      if (estimateTokens(parsedText) > 100000) {
        input = parsedText.slice(0, 60000);
      }

      sendStage(writer, { stage: Stage.GENERATING, message: "AI가 다이어그램을 생성하고 있습니다...", progress: 35, stageIndex: 3, stageTotal: STAGE_TOTAL });

      const aiProvider = await resolveProvider(user.organizationId, providerParam);
      const { result: raw, tokenUsage } = await aiProvider.streamWithSchema<DiagramGenerationResult>({
        systemPrompt: DIAGRAM_SYSTEM_PROMPT,
        userPrompt: buildDiagramUserPrompt(input),
        jsonSchema: diagramJsonSchema,
        writer,
        signal: request.signal,
        progressRange: { min: 35, max: 80 },
      });

      sendStage(writer, { stage: Stage.SANITIZING, message: "다이어그램을 정리하고 있습니다...", progress: 85, stageIndex: 4, stageTotal: STAGE_TOTAL });

      // Mermaid 코드 후처리
      const result: DiagramGenerationResult = {
        diagrams: raw.diagrams.map((d) => ({
          ...d,
          mermaidCode: sanitizeMermaid(d.mermaidCode),
        })),
      };

      sendStage(writer, { stage: Stage.SAVING, message: "결과를 저장하고 있습니다...", progress: 95, stageIndex: 5, stageTotal: STAGE_TOTAL });
      await completeJob(jobId, result, tokenUsage, user.userId);
      logActivity({ organizationId: user.organizationId, actorId: user.userId, action: ActivityAction.GENERATION_COMPLETED, jobId, metadata: { type: "diagrams" } });
      createNotification({
        userId: user.userId,
        organizationId: user.organizationId,
        type: NotificationType.GENERATION_COMPLETED,
        title: "다이어그램 생성이 완료되었습니다",
        linkUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/diagrams/${jobId}`,
      });

      writer.send({ type: "complete", data: result, tokenUsage });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "다이어그램 생성에 실패했습니다.";
      try { await failJob(jobId, err); } catch { /* DB 에러 무시 */ }
      logActivity({ organizationId: user.organizationId, actorId: user.userId, action: ActivityAction.GENERATION_FAILED, jobId, metadata: { type: "diagrams", error: errMsg } });
      writer.send({ type: "error", message: errMsg });
    }

    writer.close();
  }, request.signal);
}
