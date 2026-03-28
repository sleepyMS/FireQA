import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { activeOrganizationId: true },
    });

    const memberships = await prisma.organizationMembership.findMany({
      where: { userId: user.userId },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { joinedAt: "asc" },
    });

    return NextResponse.json({
      activeOrganizationId: dbUser?.activeOrganizationId ?? null,
      memberships: memberships.map((m) => ({
        organizationId: m.organizationId,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
      })),
    });
  } catch (error) {
    console.error("멤버십 조회 오류:", error);
    return NextResponse.json({ error: "멤버십 조회에 실패했습니다." }, { status: 500 });
  }
}
