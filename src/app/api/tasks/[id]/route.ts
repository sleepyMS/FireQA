import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { AgentTaskStatus } from "@/types/agent";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "api/tasks/id" });

// GET — 작업 상세
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;

    const task = await prisma.agentTask.findUnique({
      where: { id },
      include: { connection: { select: { id: true, name: true } } },
    });

    if (!task || task.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({
      ...task,
      context: JSON.parse(task.context),
      mcpTools: JSON.parse(task.mcpTools),
      result: task.result ? JSON.parse(task.result) : null,
    });
  } catch (error) {
    logger.error("작업 상세 조회 오류", { error });
    return NextResponse.json({ error: "조회에 실패했습니다." }, { status: 500 });
  }
}

// DELETE — 작업 취소
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;

    const task = await prisma.agentTask.findUnique({
      where: { id },
      select: { organizationId: true, status: true },
    });
    if (!task || task.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
    }

    const terminalStatuses = [AgentTaskStatus.COMPLETED, AgentTaskStatus.FAILED, AgentTaskStatus.CANCELLED, AgentTaskStatus.TIMED_OUT];
    if (terminalStatuses.includes(task.status as typeof terminalStatuses[number])) {
      return NextResponse.json({ error: "이미 종료된 작업은 취소할 수 없습니다." }, { status: 400 });
    }

    await prisma.agentTask.update({
      where: { id },
      data: { status: AgentTaskStatus.CANCELLED, completedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("작업 취소 오류", { error });
    return NextResponse.json({ error: "취소에 실패했습니다." }, { status: 500 });
  }
}
