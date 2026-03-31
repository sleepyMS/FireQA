export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/db";
import { TasksClient } from "./tasks-client";

export default async function AgentTasksPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/onboarding");
  }

  const tasks = await prisma.agentTask.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      project: { select: { id: true, name: true } },
    },
  });

  const serializedTasks = tasks.map((t) => ({
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

  return <TasksClient orgSlug={orgSlug} initialTasks={serializedTasks} />;
}
