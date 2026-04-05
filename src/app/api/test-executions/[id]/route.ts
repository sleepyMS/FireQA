import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity/log-activity";
import { ActivityAction } from "@/types/enums";
import {
  withApiHandler,
  ApiError,
  updateTestExecutionSchema,
  type UpdateTestExecutionBody,
} from "@/lib/api";

// PATCH /api/test-executions/[id] — TC 실행 결과 업데이트
export const PATCH = withApiHandler<UpdateTestExecutionBody>(
  async ({ user, body, params }) => {
    const { id } = params;
    const { status, note } = body;

    const execution = await prisma.testExecution.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        testRunId: true,
        tcId: true,
        testRun: { select: { status: true, projectId: true } },
      },
    });

    if (!execution) {
      throw ApiError.notFound("테스트 실행 항목");
    }

    if (execution.organizationId !== user.organizationId) {
      throw ApiError.forbidden();
    }

    const updated = await prisma.testExecution.update({
      where: { id },
      data: {
        status,
        ...(note !== undefined ? { note } : {}),
      },
    });

    logActivity({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: ActivityAction.TEST_EXECUTION_UPDATED,
      projectId: execution.testRun.projectId,
      metadata: {
        testRunId: execution.testRunId,
        testExecutionId: id,
        tcId: execution.tcId,
        status,
      },
    });

    return {
      id: updated.id,
      testRunId: updated.testRunId,
      tcId: updated.tcId,
      status: updated.status,
      note: updated.note,
      updatedAt: updated.updatedAt,
    };
  },
  { bodySchema: updateTestExecutionSchema },
);
