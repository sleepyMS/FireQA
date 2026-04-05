import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/db";
import { TestRunDetailClient } from "./test-run-detail-client";

export default async function TestRunDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/onboarding");

  const { orgSlug, id } = await params;

  const testRun = await prisma.testRun.findUnique({
    where: { id },
    include: {
      project: { select: { name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      executions: {
        orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!testRun || testRun.organizationId !== user.organizationId) {
    notFound();
  }

  // TC 이름을 snapshot에서 추출
  const snapshot = JSON.parse(testRun.testCasesSnapshot) as {
    sheets: Array<{ testCases: Array<{ tcId: string; name: string }> }>;
  };
  const tcNameMap = new Map<string, string>();
  for (const sheet of snapshot.sheets) {
    for (const tc of sheet.testCases) {
      tcNameMap.set(tc.tcId, tc.name);
    }
  }

  const counts = { pending: 0, passed: 0, failed: 0, skipped: 0, blocked: 0 };
  for (const exec of testRun.executions) {
    const s = exec.status as keyof typeof counts;
    if (s in counts) counts[s]++;
  }
  const total = testRun.executions.length;
  const divisor = total - counts.skipped;
  const passRate =
    divisor > 0
      ? Math.round((counts.passed / divisor) * 1000) / 10
      : null;

  const initialData = {
    id: testRun.id,
    generationJobId: testRun.generationJobId,
    projectId: testRun.projectId,
    projectName: testRun.project.name,
    status: testRun.status,
    startedAt: testRun.startedAt.toISOString(),
    completedAt: testRun.completedAt?.toISOString() ?? null,
    createdBy: testRun.createdBy
      ? { id: testRun.createdBy.id, name: testRun.createdBy.name, email: testRun.createdBy.email }
      : null,
    testCaseCount: { total, ...counts },
    passRate,
    executions: testRun.executions.map((exec) => ({
      id: exec.id,
      tcId: exec.tcId,
      tcName: tcNameMap.get(exec.tcId) ?? exec.tcId,
      status: exec.status,
      note: exec.note,
      createdAt: exec.createdAt.toISOString(),
      updatedAt: exec.updatedAt.toISOString(),
    })),
  };

  return (
    <TestRunDetailClient
      orgSlug={orgSlug}
      testRunId={id}
      initialData={initialData}
    />
  );
}
