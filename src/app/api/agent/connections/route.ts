import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { logActivity } from "@/lib/activity/log-activity";
import { ActivityAction } from "@/types/enums";
import { AgentConnectionStatus } from "@/types/agent";

// POST — agent 등록
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { name, metadata } = body as { name?: string; metadata?: Record<string, unknown> };

    if (!name?.trim()) {
      return NextResponse.json({ error: "에이전트 이름은 필수입니다." }, { status: 400 });
    }

    const connection = await prisma.agentConnection.create({
      data: {
        organizationId: user.organizationId,
        userId: user.userId,
        name: name.trim(),
        status: AgentConnectionStatus.ONLINE,
        lastHeartbeat: new Date(),
        metadata: JSON.stringify(metadata ?? {}),
      },
    });

    logActivity({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: ActivityAction.AGENT_CONNECTED,
      metadata: { connectionId: connection.id, name: connection.name },
    });

    return NextResponse.json(
      { id: connection.id, name: connection.name, status: connection.status, createdAt: connection.createdAt },
      { status: 201 }
    );
  } catch (error) {
    console.error("에이전트 등록 오류:", error);
    return NextResponse.json({ error: "에이전트 등록에 실패했습니다." }, { status: 500 });
  }
}

// GET — 연결된 agent 목록 (웹 대시보드용)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const connections = await prisma.agentConnection.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { lastHeartbeat: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        lastHeartbeat: true,
        metadata: true,
        createdAt: true,
        _count: { select: { tasks: { where: { status: "running" } } } },
      },
    });

    return NextResponse.json({
      connections: connections.map((c) => ({
        ...c,
        metadata: JSON.parse(c.metadata),
        runningTasks: c._count.tasks,
      })),
    });
  } catch (error) {
    console.error("에이전트 목록 조회 오류:", error);
    return NextResponse.json({ error: "목록 조회에 실패했습니다." }, { status: 500 });
  }
}
