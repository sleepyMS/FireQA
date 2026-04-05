import { prisma } from "@/lib/db";
import { withApiHandler } from "@/lib/api";

export const GET = withApiHandler(
  async ({ user }) => {
    const memberships = await prisma.organizationMembership.findMany({
      where: { organizationId: user.organizationId },
      select: {
        role: true,
        joinedAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { joinedAt: "asc" },
      take: 200,
    });

    return {
      members: memberships.map((m) => ({
        id: m.user.id,
        name: m.user.name ?? m.user.email,
        email: m.user.email,
        role: m.role,
        createdAt: m.joinedAt,
      })),
    };
  },
);
