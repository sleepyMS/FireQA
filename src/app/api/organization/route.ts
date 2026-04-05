import { prisma } from "@/lib/db";
import { UserRole } from "@/types/enums";
import {
  withApiHandler,
  ApiError,
  updateOrganizationSchema,
  type UpdateOrganizationBody,
} from "@/lib/api";

export const GET = withApiHandler(
  async ({ user }) => {
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        _count: { select: { memberships: true } },
      },
    });

    if (!org) {
      throw ApiError.notFound("조직");
    }

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      memberCount: org._count.memberships,
      role: user.role,
    };
  },
);

export const PATCH = withApiHandler<UpdateOrganizationBody>(
  async ({ user, body }) => {
    const { name, slug } = body;

    if (slug !== undefined) {
      const existing = await prisma.organization.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (existing && existing.id !== user.organizationId) {
        throw ApiError.conflict("슬러그");
      }
    }

    const data: Record<string, string> = {};
    if (name !== undefined) data.name = name;
    if (slug !== undefined) data.slug = slug;

    const updated = await prisma.organization.update({
      where: { id: user.organizationId },
      data,
      select: { id: true, name: true, slug: true, plan: true },
    });

    return updated;
  },
  { bodySchema: updateOrganizationSchema, minRole: UserRole.ADMIN },
);
