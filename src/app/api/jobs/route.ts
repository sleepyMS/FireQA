import { prisma } from "@/lib/db";
import {
  withApiHandler,
  ApiError,
  patchJobSchema,
  deleteJobSchema,
  type GetJobsQuery,
  type PatchJobBody,
  type DeleteJobBody,
} from "@/lib/api";

// GET /api/jobs?type=diagrams - 완료된 Job 목록 (FigJam 플러그인 선택용)
// GET /api/jobs?all=1&type=test-cases - 이력 페이지용 전체 목록
export const GET = withApiHandler<unknown, GetJobsQuery>(
  async ({ user, query }) => {
    const { type, all, cursor, projectId } = query;

    const jobSelect = {
      id: true,
      type: true,
      status: true,
      tokenUsage: true,
      createdAt: true,
      projectId: true,
      error: true,
      project: { select: { id: true, name: true } },
      upload: { select: { fileName: true } },
    } as const;

    if (all) {
      // 이력 페이지용: 모든 상태의 Job 목록 (커서 페이지네이션)
      const jobs = await prisma.generationJob.findMany({
        where: {
          project: { organizationId: user.organizationId },
          ...(projectId ? { projectId } : {}),
          ...(type ? { type } : {}),
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: jobSelect,
        take: 51,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const hasMore = jobs.length === 51;
      return { jobs: jobs.slice(0, 50), hasMore };
    }

    // FigJam 플러그인용: 완료된 Job만
    const jobs = await prisma.generationJob.findMany({
      where: {
        status: "completed",
        project: { organizationId: user.organizationId },
        ...(type ? { type } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: jobSelect,
    });

    return {
      jobs: jobs.map((job) => ({
        id: job.id,
        projectName: job.project.name,
        fileName: job.upload.fileName,
        type: job.type,
        createdAt: job.createdAt,
      })),
    };
  },
);

// PATCH /api/jobs - 프로젝트명 수정
export const PATCH = withApiHandler<PatchJobBody>(
  async ({ user, body }) => {
    const { id, projectName } = body;

    const job = await prisma.generationJob.findUnique({
      where: { id },
      select: { id: true, projectId: true, project: { select: { organizationId: true } } },
    });

    if (!job) {
      throw ApiError.notFound("이력");
    }

    if (job.project.organizationId !== user.organizationId) {
      throw ApiError.forbidden("해당 이력에 대한 권한이 없습니다.");
    }

    await prisma.project.update({
      where: { id: job.projectId },
      data: { name: projectName.trim() },
    });

    return { success: true };
  },
  { bodySchema: patchJobSchema },
);

// DELETE /api/jobs - Job 삭제 (연결된 Upload만 cascade 삭제; Project는 유지)
// 프로젝트는 first-class entity이므로 마지막 Job을 삭제해도 프로젝트는 삭제하지 않는다.
export const DELETE = withApiHandler<DeleteJobBody>(
  async ({ user, body }) => {
    const { id } = body;

    const job = await prisma.generationJob.findUnique({
      where: { id },
      select: { id: true, project: { select: { organizationId: true } } },
    });

    if (!job) {
      throw ApiError.notFound("이력");
    }

    // 사용자 조직 소속 확인
    if (job.project.organizationId !== user.organizationId) {
      throw ApiError.forbidden("해당 이력에 대한 권한이 없습니다.");
    }

    // Job만 삭제 (Upload는 onDelete: Cascade로 함께 삭제됨)
    await prisma.generationJob.delete({ where: { id } });

    return { success: true };
  },
  { bodySchema: deleteJobSchema },
);
