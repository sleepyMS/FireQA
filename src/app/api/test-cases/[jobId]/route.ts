import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity/log-activity";
import { ActivityAction } from "@/types/enums";
import {
  withApiHandler,
  ApiError,
  updateTestCasesSchema,
} from "@/lib/api";

// PUT /api/test-cases/[jobId] — 테스트케이스 수동 편집 (새 버전 생성)
export const PUT = withApiHandler(
  async ({ user, body, params }) => {
    const { jobId } = params;

    // job 소속 검증 + 최신 버전 조회 병렬 처리
    const [job, latest] = await Promise.all([
      prisma.generationJob.findFirst({
        where: {
          id: jobId,
          type: "test-cases",
          project: { organizationId: user.organizationId },
        },
        select: { id: true },
      }),
      prisma.resultVersion.findFirst({
        where: { jobId },
        orderBy: { version: "desc" },
        select: { version: true },
      }),
    ]);

    if (!job) {
      throw ApiError.notFound("테스트케이스 작업");
    }

    const resultJson = JSON.stringify({ sheets: body.sheets });
    const nextVersion = (latest?.version ?? 0) + 1;

    // 원자적 처리: 기존 활성 버전 비활성화 → 새 버전 생성 → job result 갱신
    const [, version] = await prisma.$transaction([
      prisma.resultVersion.updateMany({
        where: { jobId, isActive: true },
        data: { isActive: false },
      }),
      prisma.resultVersion.create({
        data: {
          jobId,
          version: nextVersion,
          resultJson,
          changeType: "manual-edit",
          changeSummary: body.changeSummary || "테스트케이스 수동 편집",
          isActive: true,
          createdById: user.userId,
        },
      }),
      prisma.generationJob.update({
        where: { id: jobId },
        data: { result: resultJson },
      }),
    ]);

    logActivity({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: ActivityAction.VERSION_CREATED,
      jobId,
      metadata: { changeType: "manual-edit", version: version.version },
    });

    return {
      version: {
        id: version.id,
        version: version.version,
        changeType: version.changeType,
        changeSummary: version.changeSummary,
      },
    };
  },
  {
    requireAuth: true,
    bodySchema: updateTestCasesSchema,
  },
);
