import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  // 워커 풀 상태
  const [workers, queueDepth, recentTasks] = await Promise.all([
    prisma.hostedWorker.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.agentTask.count({
      where: { mode: "hosted", status: { in: ["pending", "assigned"] } },
    }),
    prisma.agentTask.findMany({
      where: { mode: "hosted", completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      take: 100,
      select: { startedAt: true, completedAt: true, status: true },
    }),
  ]);

  // 평균 처리 시간 계산
  const durations = recentTasks
    .filter((t) => t.startedAt && t.completedAt)
    .map((t) => t.completedAt!.getTime() - t.startedAt!.getTime());
  const avgProcessingMs =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

  const errorCount = recentTasks.filter(
    (t) => t.status === "failed" || t.status === "timed_out",
  ).length;
  const errorRate =
    recentTasks.length > 0 ? errorCount / recentTasks.length : 0;

  // 상태별 워커 수
  const statusCounts: Record<string, number> = {};
  for (const w of workers) {
    statusCounts[w.status] = (statusCounts[w.status] ?? 0) + 1;
  }

  return NextResponse.json({
    workers: workers.map((w) => ({
      id: w.id,
      flyMachineId: w.flyMachineId,
      status: w.status,
      region: w.region,
      currentTaskId: w.currentTaskId,
      updatedAt: w.updatedAt,
    })),
    statusCounts,
    queueDepth,
    avgProcessingMs: Math.round(avgProcessingMs),
    errorRate: Math.round(errorRate * 100) / 100,
  });
}
