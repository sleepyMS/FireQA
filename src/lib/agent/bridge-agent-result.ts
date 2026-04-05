import { prisma } from "@/lib/db";
import { completeJob, failJob } from "@/lib/api/create-generation-job";
import { parseTaskResult } from "@/lib/agent/parse-task-result";
import { logActivity } from "@/lib/activity/log-activity";
import { createNotification } from "@/lib/notifications/create-notification";
import { ActivityAction, NotificationType, JOB_TYPE_PATH } from "@/types/enums";

const JOB_TYPE_TO_TASK_TYPE: Record<string, string> = {
  "test-cases": "tc-generate",
  "diagrams": "diagram-generate",
  "wireframes": "wireframe-generate",
  "spec-improve": "improve-spec",
};

const JOB_TYPE_TITLE: Record<string, string> = {
  "test-cases": "TC 생성이 완료되었습니다",
  "diagrams": "다이어그램 생성이 완료되었습니다",
  "wireframes": "와이어프레임 생성이 완료되었습니다",
  "spec-improve": "기획서 개선이 완료되었습니다",
};

export async function bridgeAgentResult(
  agentTaskId: string,
  rawResult: string,
  auth: { userId: string; organizationId: string }
): Promise<void> {
  const agentTask = await prisma.agentTask.findUnique({
    where: { id: agentTaskId },
    select: { context: true },
  });
  if (!agentTask) return;

  const contextRaw = agentTask.context;
  let context: Record<string, unknown> = {};
  try { context = typeof contextRaw === "string" ? JSON.parse(contextRaw) : (contextRaw as Record<string, unknown>) ?? {}; } catch { /* ignore */ }
  const generationJobId = context.generationJobId as string | undefined;
  if (!generationJobId) return;

  const generationJob = await prisma.generationJob.findUnique({
    where: { id: generationJobId },
    select: { type: true, projectId: true },
  });
  if (!generationJob) return;

  const taskType = JOB_TYPE_TO_TASK_TYPE[generationJob.type];
  if (!taskType) {
    await failJob(generationJobId, "지원하지 않는 작업 유형입니다.");
    return;
  }

  const parsed = parseTaskResult(taskType, rawResult);

  let result: unknown;
  switch (parsed.type) {
    case "tc":
      result = { sheets: parsed.sheets };
      break;
    case "diagrams":
      result = { diagrams: parsed.diagrams };
      break;
    case "mermaid":
      result = { diagrams: [{ title: "다이어그램", description: "", mermaidCode: parsed.code }] };
      break;
    case "wireframe":
      result = { screens: parsed.screens, flows: parsed.flows };
      break;
    case "spec":
      result = { markdown: parsed.markdown, summary: parsed.summary ?? "" };
      break;
    default:
      await failJob(generationJobId, "에이전트 출력을 파싱할 수 없습니다.");
      logActivity({
        organizationId: auth.organizationId,
        actorId: auth.userId,
        action: ActivityAction.GENERATION_FAILED,
        jobId: generationJobId,
        projectId: generationJob.projectId ?? undefined,
        metadata: { type: generationJob.type, source: "agent" },
      });
      return;
  }

  await completeJob(generationJobId, result, 0, auth.userId);

  logActivity({
    organizationId: auth.organizationId,
    actorId: auth.userId,
    action: ActivityAction.GENERATION_COMPLETED,
    jobId: generationJobId,
    projectId: generationJob.projectId ?? undefined,
    metadata: { type: generationJob.type, source: "agent" },
  });

  createNotification({
    userId: auth.userId,
    organizationId: auth.organizationId,
    type: NotificationType.GENERATION_COMPLETED,
    title: JOB_TYPE_TITLE[generationJob.type] ?? "생성이 완료되었습니다",
    linkUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}${JOB_TYPE_PATH[generationJob.type] ?? ""}/${generationJobId}`,
  });
}

export async function bridgeAgentFailure(
  agentTaskId: string,
  errorMessage: string,
  auth: { userId: string; organizationId: string }
): Promise<void> {
  const agentTask = await prisma.agentTask.findUnique({
    where: { id: agentTaskId },
    select: { context: true },
  });
  if (!agentTask) return;

  const contextRaw2 = agentTask.context;
  let context2: Record<string, unknown> = {};
  try { context2 = typeof contextRaw2 === "string" ? JSON.parse(contextRaw2) : (contextRaw2 as Record<string, unknown>) ?? {}; } catch { /* ignore */ }
  const generationJobId = context2.generationJobId as string | undefined;
  if (!generationJobId) return;

  const generationJob = await prisma.generationJob.findUnique({
    where: { id: generationJobId },
    select: { type: true, projectId: true },
  });
  if (!generationJob) return;

  await failJob(generationJobId, errorMessage);

  logActivity({
    organizationId: auth.organizationId,
    actorId: auth.userId,
    action: ActivityAction.GENERATION_FAILED,
    jobId: generationJobId,
    projectId: generationJob.projectId ?? undefined,
    metadata: { type: generationJob.type, source: "agent", error: errorMessage },
  });
}
