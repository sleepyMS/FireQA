import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/db";
import { TestRunsClient } from "./test-runs-client";

export default async function TestRunsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const [{ orgSlug }, user] = await Promise.all([params, getCurrentUser()]);
  if (!user) redirect("/onboarding");

  const [items, totalCount, completedJobs] = await Promise.all([
    prisma.testRun.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { startedAt: "desc" },
      take: 20,
      include: {
        project: { select: { name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        executions: { select: { status: true } },
      },
    }),
    prisma.testRun.count({
      where: { organizationId: user.organizationId },
    }),
    prisma.generationJob.findMany({
      where: {
        project: { organizationId: user.organizationId },
        status: "completed",
        type: "testcase",
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        createdAt: true,
        project: { select: { name: true } },
      },
    }),
  ]);

  const testRuns = items.map((run) => {
    const counts = { pending: 0, passed: 0, failed: 0, skipped: 0, blocked: 0 };
    for (const exec of run.executions) {
      const s = exec.status as keyof typeof counts;
      if (s in counts) counts[s]++;
    }
    const total = run.executions.length;
    const divisor = total - counts.skipped;
    const passRate =
      divisor > 0
        ? Math.round((counts.passed / divisor) * 1000) / 10
        : null;

    return {
      id: run.id,
      projectId: run.projectId,
      projectName: run.project.name,
      status: run.status,
      startedAt: run.startedAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
      createdBy: run.createdBy
        ? { id: run.createdBy.id, name: run.createdBy.name, email: run.createdBy.email }
        : null,
      testCaseCount: { total, ...counts },
      passRate,
    };
  });

  return (
    <TestRunsClient
      orgSlug={orgSlug}
      initialData={{
        testRuns,
        pagination: {
          page: 1,
          pageSize: 20,
          totalCount,
          totalPages: Math.ceil(totalCount / 20),
        },
      }}
      completedJobs={completedJobs.map((j) => ({
        id: j.id,
        type: j.type,
        createdAt: j.createdAt.toISOString(),
        projectName: j.project.name,
      }))}
    />
  );
}
