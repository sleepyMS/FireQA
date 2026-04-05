import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity/log-activity";
import { ActivityAction } from "@/types/enums";
import {
  withApiHandler,
  ApiError,
  getVersionsQuerySchema,
  createVersionSchema,
  type GetVersionsQuery,
  type CreateVersionBody,
} from "@/lib/api";

// GET /api/versions?jobId=xxx — list versions for a job
export const GET = withApiHandler<unknown, GetVersionsQuery>(
  async ({ user, query }) => {
    const { jobId } = query;

    // Verify job belongs to user's org
    const job = await prisma.generationJob.findFirst({
      where: { id: jobId, project: { organizationId: user.organizationId } },
    });
    if (!job) throw ApiError.notFound("작업");

    const versions = await prisma.resultVersion.findMany({
      where: { jobId },
      select: {
        id: true,
        version: true,
        changeType: true,
        changeSummary: true,
        instruction: true,
        isActive: true,
        resultJson: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { version: "asc" },
    });

    return { versions };
  },
  { querySchema: getVersionsQuerySchema },
);

// POST /api/versions — create a new version manually
export const POST = withApiHandler<CreateVersionBody>(
  async ({ user, body }) => {
    const { jobId, changeType, changeSummary, instruction, resultJson } = body;

    // job 소속 검증 + 최신 버전 번호 조회를 병렬로
    const [job, latest] = await Promise.all([
      prisma.generationJob.findFirst({
        where: { id: jobId, project: { organizationId: user.organizationId } },
      }),
      prisma.resultVersion.findFirst({
        where: { jobId },
        orderBy: { version: "desc" },
        select: { version: true },
      }),
    ]);
    if (!job) throw ApiError.notFound("작업");
    const nextVersion = (latest?.version ?? 0) + 1;

    // Deactivate all current versions, create new active one
    await prisma.resultVersion.updateMany({ where: { jobId, isActive: true }, data: { isActive: false } });

    const version = await prisma.resultVersion.create({
      data: {
        jobId,
        version: nextVersion,
        resultJson,
        changeType,
        changeSummary,
        instruction,
        isActive: true,
        createdById: user.userId,
      },
    });

    logActivity({ organizationId: user.organizationId, actorId: user.userId, action: ActivityAction.VERSION_CREATED, jobId, metadata: { changeType, version: version.version } });

    return { version };
  },
  { bodySchema: createVersionSchema },
);
