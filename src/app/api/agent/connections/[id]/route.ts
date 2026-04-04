import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { logActivity } from "@/lib/activity/log-activity";
import { ActivityAction } from "@/types/enums";
import { AgentConnectionStatus } from "@/types/agent";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "api/agent/connections/id" });

// PUT — heartbeat + 상태 업데이트
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
    const body = await request.json().catch(() => ({}));
    const { metadata } = body as { metadata?: Record<string, unknown> };

    const connection = await prisma.agentConnection.findUnique({ where: { id } });
    if (!connection || connection.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "에이전트를 찾을 수 없습니다." }, { status: 404 });
    }

    const updated = await prisma.agentConnection.update({
      where: { id },
      data: {
        status: AgentConnectionStatus.ONLINE,
        lastHeartbeat: new Date(),
        ...(metadata ? { metadata: JSON.stringify(metadata) } : {}),
      },
    });

    // 취소된 작업 확인하여 agent에 알림
    const cancelledTasks = await prisma.agentTask.findMany({
      where: { connectionId: id, status: "cancelled" },
      select: { id: true },
    });

    return NextResponse.json({
      status: updated.status,
      lastHeartbeat: updated.lastHeartbeat,
      cancelledTaskIds: cancelledTasks.map((t) => t.id),
    });
  } catch (error) {
    logger.error("heartbeat 오류", { error });
    return NextResponse.json({ error: "heartbeat 실패" }, { status: 500 });
  }
}

// DELETE — 연결 해제
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

    const connection = await prisma.agentConnection.findUnique({ where: { id } });
    if (!connection || connection.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "에이전트를 찾을 수 없습니다." }, { status: 404 });
    }

    await prisma.agentConnection.update({
      where: { id },
      data: { status: AgentConnectionStatus.OFFLINE },
    });

    logActivity({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: ActivityAction.AGENT_DISCONNECTED,
      metadata: { connectionId: id, name: connection.name },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("에이전트 해제 오류", { error });
    return NextResponse.json({ error: "해제에 실패했습니다." }, { status: 500 });
  }
}
