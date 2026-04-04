import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity/log-activity";
import { ActivityAction } from "@/types/enums";
import {
  withApiHandler,
  ApiError,
  ApiErrorCode,
  updateTestRunSchema,
  type UpdateTestRunBody,
} from "@/lib/api";

// GET /api/test-runs/[id] — 테스트 실행 상세
export const GET = withApiHandler(async ({ user, params }) => {
  const { id } = params;

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

  if (!testRun) {
    throw ApiError.notFound("테스트 실행");
  }

  if (testRun.organizationId !== user.organizationId) {
    throw ApiError.forbidden();
  }

  // TC 이름을 snapshot에서 추출
  const snapshot = JSON.parse(testRun.testCasesSnapshot) as {
    sheets: Array<{
      testCases: Array<{ tcId: string; name: string }>;
    }>;
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

  return {
    id: testRun.id,
    generationJobId: testRun.generationJobId,
    projectId: testRun.projectId,
    projectName: testRun.project.name,
    status: testRun.status,
    startedAt: testRun.startedAt,
    completedAt: testRun.completedAt,
    createdBy: testRun.createdBy
      ? {
          id: testRun.createdBy.id,
          name: testRun.createdBy.name,
          email: testRun.createdBy.email,
        }
      : null,
    testCaseCount: { total, ...counts },
    passRate,
    executions: testRun.executions.map((exec) => ({
      id: exec.id,
      tcId: exec.tcId,
      tcName: tcNameMap.get(exec.tcId) ?? exec.tcId,
      status: exec.status,
      note: exec.note,
      createdAt: exec.createdAt,
      updatedAt: exec.updatedAt,
    })),
  };
});

// PATCH /api/test-runs/[id] — 상태 변경 (completed | aborted)
export const PATCH = withApiHandler<UpdateTestRunBody>(
  async ({ user, body, params }) => {
    const { id } = params;
    const { status } = body;

    const testRun = await prisma.testRun.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        projectId: true,
        status: true,
      },
    });

    if (!testRun) {
      throw ApiError.notFound("테스트 실행");
    }

    if (testRun.organizationId !== user.organizationId) {
      throw ApiError.forbidden();
    }

    if (testRun.status !== "in_progress") {
      throw ApiError.conflict(
        "테스트 실행",
        "이미 완료되었거나 중단된 실행은 상태를 변경할 수 없습니다.",
      );
    }

    const now = new Date();
    const updateData: Record<string, unknown> = { status };
    if (status === "completed") {
      updateData.completedAt = now;
    } else if (status === "aborted") {
      updateData.abortedAt = now;
    }

    // 상태 변경 + pending TC를 skipped로 자동 전환 (aborted 시)
    const updated = await prisma.$transaction(async (tx) => {
      const run = await tx.testRun.update({
        where: { id },
        data: updateData,
      });

      if (status === "aborted") {
        await tx.testExecution.updateMany({
          where: { testRunId: id, status: "pending" },
          data: { status: "skipped" },
        });
      }

      return run;
    });

    const action =
      status === "completed"
        ? ActivityAction.TEST_RUN_COMPLETED
        : ActivityAction.TEST_RUN_ABORTED;

    logActivity({
      organizationId: user.organizationId,
      actorId: user.userId,
      action,
      projectId: testRun.projectId,
      metadata: { testRunId: id },
    });

    return {
      id: updated.id,
      status: updated.status,
      completedAt: updated.completedAt,
      abortedAt: updated.abortedAt,
    };
  },
  { bodySchema: updateTestRunSchema },
);
