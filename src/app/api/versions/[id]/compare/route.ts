import { withApiHandler } from "@/lib/api";
import { compareVersionsQuerySchema } from "@/lib/api/schemas/versions";
import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export const GET = withApiHandler(
  async ({ user, query, params }) => {
    const sourceId = params.id;
    const { targetId } = query;

    // 두 버전을 병렬 조회
    const [source, target] = await Promise.all([
      prisma.resultVersion.findUnique({
        where: { id: sourceId },
        include: {
          job: { include: { project: { select: { organizationId: true } } } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.resultVersion.findUnique({
        where: { id: targetId },
        include: {
          job: { include: { project: { select: { organizationId: true } } } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    if (!source || source.job.project.organizationId !== user.organizationId) {
      throw ApiError.notFound("기준 버전");
    }
    if (!target || target.job.project.organizationId !== user.organizationId) {
      throw ApiError.notFound("비교 대상 버전");
    }

    // 같은 Job에 속하는지 검증
    if (source.jobId !== target.jobId) {
      throw ApiError.validationError(
        "두 버전은 같은 생성 작업에 속해야 합니다.",
      );
    }

    return {
      source: {
        id: source.id,
        version: source.version,
        changeType: source.changeType,
        changeSummary: source.changeSummary,
        resultJson: source.resultJson,
        createdAt: source.createdAt,
        createdBy: source.createdBy,
      },
      target: {
        id: target.id,
        version: target.version,
        changeType: target.changeType,
        changeSummary: target.changeSummary,
        resultJson: target.resultJson,
        createdAt: target.createdAt,
        createdBy: target.createdBy,
      },
    };
  },
  {
    querySchema: compareVersionsQuerySchema,
  },
);
