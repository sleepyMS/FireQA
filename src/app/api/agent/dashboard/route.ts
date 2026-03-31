import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";

// GET — 대시보드용 connections + tasks를 단일 응답으로 반환 (HTTP 라운드트립 절감)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const organizationId = user.organizationId;

    const [connections, tasks] = await Promise.all([
      prisma.agentConnection.findMany({
        where: { organizationId },
        orderBy: { lastHeartbeat: "desc" },
        take: 10,
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
      }),
      prisma.agentTask.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          type: true,
          status: true,
          prompt: true,
          projectId: true,
          connectionId: true,
          startedAt: true,
          completedAt: true,
          errorMessage: true,
          createdAt: true,
          project: { select: { id: true, name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      connections: connections.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        status: c.status,
        lastHeartbeat: c.lastHeartbeat?.toISOString() ?? null,
        metadata: JSON.parse(c.metadata),
        runningTasks: c._count.tasks,
      })),
      tasks,
    });
  } catch (error) {
    console.error("대시보드 데이터 조회 오류:", error);
    return NextResponse.json({ error: "조회에 실패했습니다." }, { status: 500 });
  }
}
