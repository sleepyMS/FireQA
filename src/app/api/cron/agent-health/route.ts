import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Vercel Cron — runs every minute
// Secured via CRON_SECRET env var (set in Vercel dashboard)
export async function GET(request: Request) {
  // Verify cron secret if set
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();

  // 1. Mark agents offline if heartbeat > 30s ago
  const offlineThreshold = new Date(now.getTime() - 30_000);
  const offlineResult = await prisma.agentConnection.updateMany({
    where: {
      status: "online",
      OR: [
        { lastHeartbeat: { lt: offlineThreshold } },
        { lastHeartbeat: null },
      ],
    },
    data: { status: "offline" },
  });

  // 2. Return ASSIGNED tasks stuck > 2 minutes to PENDING
  const assignedThreshold = new Date(now.getTime() - 2 * 60_000);
  const pendingResult = await prisma.agentTask.updateMany({
    where: {
      status: "assigned",
      updatedAt: { lt: assignedThreshold },
    },
    data: { status: "pending", connectionId: null },
  });

  // 3. Timeout RUNNING tasks that exceeded timeoutMs
  // This requires per-row logic since timeoutMs differs per task.
  // Fetch and update individually:
  const runningTasks = await prisma.agentTask.findMany({
    where: { status: "running", startedAt: { not: null } },
    select: { id: true, startedAt: true, timeoutMs: true },
  });

  let timedOutCount = 0;
  for (const task of runningTasks) {
    if (task.startedAt) {
      const deadline = new Date(task.startedAt.getTime() + task.timeoutMs);
      if (now > deadline) {
        await prisma.agentTask.update({
          where: { id: task.id },
          data: {
            status: "timed_out",
            completedAt: now,
            errorMessage: "작업 시간이 초과되었습니다.",
          },
        });
        timedOutCount++;
      }
    }
  }

  return NextResponse.json({
    agentsMarkedOffline: offlineResult.count,
    tasksReturnedToPending: pendingResult.count,
    tasksTimedOut: timedOutCount,
  });
}
