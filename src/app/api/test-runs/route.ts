import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity/log-activity";
import { ActivityAction } from "@/types/enums";
import {
  withApiHandler,
  ApiError,
  ApiErrorCode,
  createTestRunSchema,
  listTestRunsQuerySchema,
  type CreateTestRunBody,
  type ListTestRunsQuery,
} from "@/lib/api";

// POST /api/test-runs — 새 테스트 실행 시작
export const POST = withApiHandler<CreateTestRunBody>(
  async ({ user, body }) => {
    const { generationJobId } = body;

    // Job 조회 + 활성 ResultVersion 병렬 조회
    const [job, activeVersion] = await Promise.all([
      prisma.generationJob.findFirst({
        where: {
          id: generationJobId,
          project: { organizationId: user.organizationId },
        },
        select: { id: true, projectId: true, status: true },
      }),
      prisma.resultVersion.findFirst({
        where: { jobId: generationJobId, isActive: true },
        select: { resultJson: true },
      }),
    ]);

    if (!job) {
      throw ApiError.notFound("생성 작업");
    }

    if (job.status !== "completed") {
      throw new ApiError({
        code: ApiErrorCode.UNPROCESSABLE,
        message: "완료된 작업만 테스트 실행이 가능합니다.",
      });
    }

    // 활성 버전이 없으면 Job의 result 사용
    let resultJson = activeVersion?.resultJson;
    if (!resultJson) {
      const jobWithResult = await prisma.generationJob.findUnique({
        where: { id: generationJobId },
        select: { result: true },
      });
      resultJson = jobWithResult?.result ?? undefined;
    }

    if (!resultJson) {
      throw new ApiError({
        code: ApiErrorCode.UNPROCESSABLE,
        message: "테스트케이스 결과가 없습니다.",
      });
    }

    // TC 추출
    const parsed = JSON.parse(resultJson) as {
      sheets: Array<{
        testCases: Array<{ tcId: string }>;
      }>;
    };
    const allTestCases = parsed.sheets.flatMap((s) => s.testCases);

    if (allTestCases.length === 0) {
      throw new ApiError({
        code: ApiErrorCode.UNPROCESSABLE,
        message: "테스트케이스가 없습니다.",
      });
    }

    // TestRun + TestExecution 원자적 생성
    const testRun = await prisma.$transaction(async (tx) => {
      const run = await tx.testRun.create({
        data: {
          generationJobId,
          projectId: job.projectId,
          organizationId: user.organizationId,
          createdById: user.userId,
          testCasesSnapshot: resultJson!,
          status: "in_progress",
        },
      });

      await tx.testExecution.createMany({
        data: allTestCases.map((tc) => ({
          testRunId: run.id,
          organizationId: user.organizationId,
          tcId: tc.tcId,
          status: "pending",
        })),
      });

      return run;
    });

    logActivity({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: ActivityAction.TEST_RUN_STARTED,
      projectId: job.projectId,
      metadata: {
        testRunId: testRun.id,
        generationJobId,
        totalTestCases: allTestCases.length,
      },
    });

    return {
      id: testRun.id,
      generationJobId,
      projectId: job.projectId,
      status: "in_progress",
      startedAt: testRun.startedAt,
      totalTestCases: allTestCases.length,
      testCaseCount: {
        pending: allTestCases.length,
        passed: 0,
        failed: 0,
        skipped: 0,
        blocked: 0,
      },
    };
  },
  { bodySchema: createTestRunSchema, successStatus: 201 },
);

// GET /api/test-runs — 테스트 실행 목록
export const GET = withApiHandler<unknown, ListTestRunsQuery>(
  async ({ user, query }) => {
    const { projectId, status, page, pageSize, sortBy, order } = query;

    const where = {
      organizationId: user.organizationId,
      ...(projectId ? { projectId } : {}),
      ...(status ? { status } : {}),
    };

    const [items, totalCount] = await Promise.all([
      prisma.testRun.findMany({
        where,
        orderBy: { [sortBy]: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          project: { select: { name: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          executions: { select: { status: true } },
        },
      }),
      prisma.testRun.count({ where }),
    ]);

    const testRuns = items.map((run) => {
      const counts = { pending: 0, passed: 0, failed: 0, skipped: 0, blocked: 0 };
      for (const exec of run.executions) {
        const s = exec.status as keyof typeof counts;
        if (s in counts) counts[s]++;
      }
      const total = run.executions.length;
      const divisor = total - counts.skipped;
      const passRate = divisor > 0 ? Math.round((counts.passed / divisor) * 1000) / 10 : null;

      return {
        id: run.id,
        projectId: run.projectId,
        projectName: run.project.name,
        status: run.status,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        createdBy: run.createdBy
          ? { id: run.createdBy.id, name: run.createdBy.name, email: run.createdBy.email }
          : null,
        testCaseCount: { total, ...counts },
        passRate,
      };
    });

    return {
      testRuns,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  },
  { querySchema: listTestRunsQuerySchema },
);
