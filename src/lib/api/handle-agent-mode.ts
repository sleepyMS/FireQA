import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { failJob } from "@/lib/api/create-generation-job";
import { buildGenerationPrompt } from "@/lib/agent/build-generation-prompt";
import { AgentTaskStatus } from "@/types/agent";
import type { JobType } from "@/types/enums";

const JOB_TYPE_TO_TASK_TYPE: Record<string, string> = {
  "test-cases": "tc-generate",
  "diagrams": "diagram-generate",
  "wireframes": "wireframe-generate",
  "spec-improve": "improve-spec",
};

export async function handleAgentMode(params: {
  jobId: string;
  projectId: string;
  parsedText: string;
  jobType: JobType;
  systemPrompt: string;
  auth: { userId: string; organizationId: string };
  figmaFileKey?: string;
  model?: string;
  agentConnectionId?: string;
}): Promise<NextResponse> {
  const { jobId, projectId, parsedText, jobType, systemPrompt, auth, figmaFileKey, model, agentConnectionId } = params;

  // 에이전트 활성 확인: status 필드 대신 heartbeat 시각으로 판단 (30초 이내)
  // status 필드는 크론 없이는 stale할 수 있으므로 직접 체크
  const freshThreshold = new Date(Date.now() - 30_000);
  const onlineAgent = await prisma.agentConnection.findFirst({
    where: agentConnectionId
      ? { id: agentConnectionId, organizationId: auth.organizationId, lastHeartbeat: { gt: freshThreshold } }
      : { organizationId: auth.organizationId, lastHeartbeat: { gt: freshThreshold } },
    select: { id: true },
  });

  if (!onlineAgent) {
    await failJob(jobId, "온라인 상태의 에이전트가 없습니다. 에이전트를 실행한 후 다시 시도하세요.");
    return NextResponse.json(
      { error: "온라인 상태의 에이전트가 없습니다." },
      { status: 409 }
    );
  }

  const taskType = JOB_TYPE_TO_TASK_TYPE[jobType];
  const prompt = buildGenerationPrompt(taskType, systemPrompt, parsedText, figmaFileKey);

  // AgentTask 생성 (context에 generationJobId 포함)
  const agentTask = await prisma.agentTask.create({
    data: {
      organizationId: auth.organizationId,
      projectId,
      createdById: auth.userId,
      type: taskType,
      status: AgentTaskStatus.PENDING,
      prompt,
      context: JSON.stringify({ generationJobId: jobId, ...(figmaFileKey ? { figmaFileKey } : {}), ...(model ? { model } : {}) }),
      timeoutMs: 600_000, // 10분
    },
    select: { id: true },
  });

  // GenerationJob.config에 executionMode와 agentTaskId 기록
  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      config: JSON.stringify({ executionMode: "agent", agentTaskId: agentTask.id }),
    },
  });

  return NextResponse.json({ jobId, agentTaskId: agentTask.id }, { status: 201 });
}
