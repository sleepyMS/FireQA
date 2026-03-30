import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { logActivity } from "@/lib/activity/log-activity";
import { ActivityAction } from "@/types/enums";
import { AgentTaskStatus } from "@/types/agent";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { result, sessionId } = body as {
      result: unknown;
      sessionId?: string;
    };

    const task = await prisma.agentTask.findUnique({ where: { id } });
    if (!task || task.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: "작업을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Idempotent: 이미 완료된 작업은 무시
    if (task.status === AgentTaskStatus.COMPLETED) {
      return NextResponse.json({ status: task.status });
    }

    const updated = await prisma.agentTask.update({
      where: { id },
      data: {
        status: AgentTaskStatus.COMPLETED,
        result: JSON.stringify(result),
        completedAt: new Date(),
        ...(sessionId ? { sessionId } : {}),
      },
    });

    logActivity({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: ActivityAction.AGENT_TASK_COMPLETED,
      projectId: task.projectId ?? undefined,
      metadata: { taskId: id, type: task.type },
    });

    return NextResponse.json({ status: updated.status });
  } catch (error) {
    console.error("결과 전송 오류:", error);
    return NextResponse.json(
      { error: "결과 전송에 실패했습니다." },
      { status: 500 }
    );
  }
}
