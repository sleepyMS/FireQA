import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { logActivity } from "@/lib/activity/log-activity";
import { ActivityAction } from "@/types/enums";
import { AgentTaskType, AgentTaskStatus } from "@/types/agent";

const VALID_TYPES = new Set(Object.values(AgentTaskType));

// POST — 작업 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { type, projectId, prompt, context, mcpTools } = body as {
      type: string;
      projectId?: string;
      prompt?: string;
      context?: Record<string, unknown>;
      mcpTools?: string[];
    };

    if (!type || !VALID_TYPES.has(type as AgentTaskType)) {
      return NextResponse.json({ error: "유효하지 않은 작업 유형입니다." }, { status: 400 });
    }
    if (!prompt?.trim()) {
      return NextResponse.json({ error: "프롬프트는 필수입니다." }, { status: 400 });
    }

    if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project || project.organizationId !== user.organizationId) {
        return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
      }
    }

    const onlineAgent = await prisma.agentConnection.findFirst({
      where: { organizationId: user.organizationId, status: "online" },
    });

    if (!onlineAgent) {
      return NextResponse.json(
        { error: "연결된 에이전트가 없습니다. fireqa-agent를 실행해주세요." },
        { status: 409 }
      );
    }

    const task = await prisma.agentTask.create({
      data: {
        organizationId: user.organizationId,
        projectId: projectId ?? null,
        createdById: user.userId,
        type,
        prompt: prompt.trim(),
        context: JSON.stringify(context ?? {}),
        mcpTools: JSON.stringify(mcpTools ?? []),
      },
    });

    logActivity({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: ActivityAction.AGENT_TASK_CREATED,
      projectId: projectId ?? undefined,
      metadata: { taskId: task.id, type },
    });

    return NextResponse.json(
      { id: task.id, type: task.type, status: task.status, createdAt: task.createdAt },
      { status: 201 }
    );
  } catch (error) {
    console.error("작업 생성 오류:", error);
    return NextResponse.json({ error: "작업 생성에 실패했습니다." }, { status: 500 });
  }
}

// GET — 작업 목록
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status") || undefined;
    const type = searchParams.get("type") || undefined;
    const projectId = searchParams.get("projectId") || undefined;
    const limitParam = parseInt(searchParams.get("limit") || "20", 10);
    const limit = isNaN(limitParam) || limitParam < 1 ? 20 : Math.min(limitParam, 100);

    const tasks = await prisma.agentTask.findMany({
      where: {
        organizationId: user.organizationId,
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true, type: true, status: true, prompt: true, projectId: true,
        connectionId: true, startedAt: true, completedAt: true, errorMessage: true, createdAt: true,
        project: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("작업 목록 조회 오류:", error);
    return NextResponse.json({ error: "목록 조회에 실패했습니다." }, { status: 500 });
  }
}
