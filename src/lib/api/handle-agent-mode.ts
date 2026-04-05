import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { failJob } from "@/lib/api/create-generation-job";
import { buildGenerationPrompt } from "@/lib/agent/build-generation-prompt";
import { AgentConnectionStatus, AgentTaskStatus } from "@/types/agent";
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
}): Promise<NextResponse> {
  const { jobId, projectId, parsedText, jobType, systemPrompt, auth } = params;

  // 에이전트 온라인 확인
  const onlineAgent = await prisma.agentConnection.findFirst({
    where: {
      organizationId: auth.organizationId,
      status: AgentConnectionStatus.ONLINE,
    },
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
  const prompt = buildGenerationPrompt(taskType, systemPrompt, parsedText);

  // AgentTask 생성 (context에 generationJobId 포함)
  const agentTask = await prisma.agentTask.create({
    data: {
      organizationId: auth.organizationId,
      projectId,
      createdById: auth.userId,
      type: taskType,
      status: AgentTaskStatus.PENDING,
      prompt,
      context: JSON.stringify({ generationJobId: jobId }),
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
