import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyCronSecret } from "@/lib/auth/verify-cron-secret";
import { AgentConnectionStatus, AgentTaskStatus } from "@/types/agent";

export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  const now = new Date();

  const offlineThreshold = new Date(now.getTime() - 30_000);
  const offlineResult = await prisma.agentConnection.updateMany({
    where: {
      status: AgentConnectionStatus.ONLINE,
      OR: [
        { lastHeartbeat: { lt: offlineThreshold } },
        { lastHeartbeat: null },
      ],
    },
    data: { status: AgentConnectionStatus.OFFLINE },
  });

  const assignedThreshold = new Date(now.getTime() - 2 * 60_000);
  const pendingResult = await prisma.agentTask.updateMany({
    where: {
      status: AgentTaskStatus.ASSIGNED,
      updatedAt: { lt: assignedThreshold },
    },
    data: { status: AgentTaskStatus.PENDING, connectionId: null },
  });

  const runningTasks = await prisma.agentTask.findMany({
    where: { status: AgentTaskStatus.RUNNING, startedAt: { not: null } },
    select: { id: true, startedAt: true, timeoutMs: true },
  });

  let timedOutCount = 0;
  for (const task of runningTasks) {
    if (task.startedAt && now > new Date(task.startedAt.getTime() + task.timeoutMs)) {
      await prisma.agentTask.update({
        where: { id: task.id },
        data: { status: AgentTaskStatus.TIMED_OUT, completedAt: now, errorMessage: "작업 시간이 초과되었습니다." },
      });
      timedOutCount++;
    }
  }

  // timeoutMs varies per task, so we fetch and filter per-row
  const pendingTasks = await prisma.agentTask.findMany({
    where: { status: AgentTaskStatus.PENDING },
    select: { id: true, createdAt: true, timeoutMs: true },
  });

  let pendingTimedOutCount = 0;
  for (const task of pendingTasks) {
    if (now > new Date(task.createdAt.getTime() + task.timeoutMs)) {
      await prisma.agentTask.update({
        where: { id: task.id },
        data: { status: AgentTaskStatus.TIMED_OUT, completedAt: now, errorMessage: "에이전트가 연결되지 않아 작업이 시간 초과되었습니다." },
      });
      pendingTimedOutCount++;
    }
  }

  return NextResponse.json({
    agentsMarkedOffline: offlineResult.count,
    tasksReturnedToPending: pendingResult.count,
    tasksTimedOut: timedOutCount,
    pendingTimedOut: pendingTimedOutCount,
  });
}
