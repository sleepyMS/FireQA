import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { AgentTaskStatus } from "@/types/agent";

// POST: 채팅 작업 생성
export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const { prompt } = await request.json() as { prompt: string };
  if (!prompt?.trim()) return NextResponse.json({ error: "메시지를 입력하세요." }, { status: 400 });

  const freshThreshold = new Date(Date.now() - 30_000);
  const agent = await prisma.agentConnection.findFirst({
    where: { organizationId: user.organizationId, lastHeartbeat: { gt: freshThreshold } },
    select: { id: true },
  });
  if (!agent) {
    return NextResponse.json({ error: "온라인 에이전트가 없습니다. 에이전트를 먼저 실행하세요." }, { status: 409 });
  }

  const task = await prisma.agentTask.create({
    data: {
      organizationId: user.organizationId,
      createdById: user.userId,
      type: "chat",
      status: AgentTaskStatus.PENDING,
      prompt: prompt.trim(),
      context: "{}",
      timeoutMs: 120_000,
    },
    select: { id: true },
  });

  return NextResponse.json({ taskId: task.id }, { status: 201 });
}

// GET: 작업 상태 + 결과 조회
export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const taskId = request.nextUrl.searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "taskId가 필요합니다." }, { status: 400 });

  const task = await prisma.agentTask.findUnique({
    where: { id: taskId },
    select: { status: true, result: true, errorMessage: true, organizationId: true },
  });
  if (!task || task.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
  }

  let output: string | null = null;
  if (task.result) {
    try {
      const parsed = JSON.parse(task.result as string) as { output?: string };
      output = parsed.output ?? null;
    } catch {
      output = task.result as string;
    }
  }

  return NextResponse.json({ status: task.status, output, errorMessage: task.errorMessage });
}
