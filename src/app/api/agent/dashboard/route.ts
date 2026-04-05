import { prisma } from "@/lib/db";
import { withApiHandler } from "@/lib/api";
import { AgentConnectionStatus } from "@/types/agent";

export const GET = withApiHandler(
  async ({ user }) => {
    const organizationId = user.organizationId;

    const [connections, tasks] = await Promise.all([
      prisma.agentConnection.findMany({
        where: { organizationId, status: { not: AgentConnectionStatus.OFFLINE } },
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

    return {
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
    };
  },
);
