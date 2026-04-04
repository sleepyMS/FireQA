import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { AgentTaskStatus } from "@/types/agent";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "api/agent/tasks/status" });

const VALID_TRANSITIONS: Record<string, string[]> = {
  [AgentTaskStatus.ASSIGNED]: [AgentTaskStatus.RUNNING, AgentTaskStatus.FAILED],
  [AgentTaskStatus.RUNNING]: [
    AgentTaskStatus.COMPLETED,
    AgentTaskStatus.FAILED,
    AgentTaskStatus.TIMED_OUT,
  ],
};

export async function PUT(
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
    const { status, errorMessage, sessionId } = body as {
      status: string;
      errorMessage?: string;
      sessionId?: string;
    };

    const task = await prisma.agentTask.findUnique({ where: { id } });
    if (!task || task.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: "작업을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const allowed = VALID_TRANSITIONS[task.status];
    if (!allowed || !allowed.includes(status)) {
      return NextResponse.json(
        { error: `${task.status} → ${status} 전환은 허용되지 않습니다.` },
        { status: 400 }
      );
    }

    const now = new Date();
    const updated = await prisma.agentTask.update({
      where: { id },
      data: {
        status,
        ...(status === AgentTaskStatus.RUNNING ? { startedAt: now } : {}),
        ...(status === AgentTaskStatus.COMPLETED ||
        status === AgentTaskStatus.FAILED
          ? { completedAt: now }
          : {}),
        ...(errorMessage ? { errorMessage } : {}),
        ...(sessionId ? { sessionId } : {}),
      },
    });

    return NextResponse.json({ status: updated.status });
  } catch (error) {
    logger.error("상태 변경 오류", { error });
    return NextResponse.json(
      { error: "상태 변경에 실패했습니다." },
      { status: 500 }
    );
  }
}
