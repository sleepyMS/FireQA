export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/db";
import { AgentDashboardClient } from "./agent-dashboard-client";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/onboarding");
  }

  const organizationId = user.organizationId;

  const [connections, recentTasks] = await Promise.all([
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
      include: {
        project: { select: { id: true, name: true } },
      },
    }),
  ]);

  // 서버 데이터를 클라이언트에서 사용할 수 있는 직렬화 가능한 형태로 변환
  const serializedConnections = connections.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    status: c.status,
    lastHeartbeat: c.lastHeartbeat?.toISOString() ?? null,
    metadata: JSON.parse(c.metadata) as { cli?: string; os?: string; version?: string },
    runningTasks: c._count.tasks,
  }));

  const serializedTasks = recentTasks.map((t) => ({
    id: t.id,
    type: t.type,
    status: t.status,
    prompt: t.prompt,
    projectId: t.projectId,
    startedAt: t.startedAt?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    errorMessage: t.errorMessage,
    createdAt: t.createdAt.toISOString(),
    project: t.project,
  }));

  return (
    <AgentDashboardClient
      orgSlug={orgSlug}
      initialConnections={serializedConnections}
      initialTasks={serializedTasks}
    />
  );
}
