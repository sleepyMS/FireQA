import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity/log-activity";
import { ActivityAction, PLAN_LABEL } from "@/types/enums";
import { getOrgPlan } from "@/lib/billing/get-org-plan";
import { getPlanLimits } from "@/lib/billing/plan-limits";
import {
  withApiHandler,
  ApiError,
  ApiErrorCode,
  getProjectsSchema,
  createProjectSchema,
  type GetProjectsQuery,
  type CreateProjectBody,
} from "@/lib/api";

// GET /api/projects — 조직 프로젝트 목록 (커서 페이지네이션)
export const GET = withApiHandler<unknown, GetProjectsQuery>(
  async ({ user, query }) => {
    const { status: statusParam, search, limit, cursor } = query;

    // 커서 파싱: "ISO날짜_cuid" 형식 (잘못된 형식은 400 반환)
    let cursorDate: Date | undefined;
    let cursorId: string | undefined;
    if (cursor) {
      const underscoreIdx = cursor.indexOf("_");
      if (underscoreIdx === -1) {
        throw new ApiError({
          code: ApiErrorCode.INVALID_PARAMETER,
          message: "잘못된 cursor 형식입니다.",
        });
      }
      cursorDate = new Date(cursor.slice(0, underscoreIdx));
      cursorId = cursor.slice(underscoreIdx + 1);
      if (isNaN(cursorDate.getTime()) || !cursorId) {
        throw new ApiError({
          code: ApiErrorCode.INVALID_PARAMETER,
          message: "잘못된 cursor 형식입니다.",
        });
      }
    }

    const where = {
      organizationId: user.organizationId,
      status: statusParam,
      ...(statusParam !== "deleted"
        ? { deletedAt: null }
        : { deletedAt: { not: null } }),
      ...(search
        ? { name: { contains: search, mode: "insensitive" as const } }
        : {}),
      ...(cursorDate && cursorId
        ? {
            OR: [
              { createdAt: { lt: cursorDate } },
              { createdAt: cursorDate, id: { lt: cursorId } },
            ],
          }
        : {}),
    };

    const items = await prisma.project.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        archivedAt: true,
        _count: { select: { jobs: true, uploads: true } },
      },
    });

    const hasMore = items.length > limit;
    if (hasMore) items.pop();

    const nextCursor = hasMore
      ? `${items[items.length - 1].createdAt.toISOString()}_${items[items.length - 1].id}`
      : null;

    return {
      projects: items,
      nextCursor,
    };
  },
  { querySchema: getProjectsSchema },
);

// POST /api/projects — 프로젝트 생성
export const POST = withApiHandler<CreateProjectBody>(
  async ({ user, body }) => {
    const { name, description } = body;

    const [plan, projectCount] = await Promise.all([
      getOrgPlan(user.organizationId),
      prisma.project.count({
        where: { organizationId: user.organizationId, status: "active" },
      }),
    ]);
    const limits = getPlanLimits(plan);
    if (limits.projectsMax !== Infinity && projectCount >= limits.projectsMax) {
      throw ApiError.planLimitExceeded(
        `${PLAN_LABEL[plan] ?? plan} 플랜의 프로젝트`,
        limits.projectsMax,
      );
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        organizationId: user.organizationId,
        createdById: user.userId,
      },
    });

    logActivity({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: ActivityAction.PROJECT_CREATED,
      projectId: project.id,
      metadata: { name: project.name },
    });

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      createdAt: project.createdAt,
    };
  },
  { bodySchema: createProjectSchema, successStatus: 201 },
);
