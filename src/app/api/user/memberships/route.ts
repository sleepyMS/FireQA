import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/get-current-user";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // DB에 아직 없는 유저 (온보딩 전) — 빈 멤버십 반환
    if (!session.userId) {
      return NextResponse.json({ activeOrganizationId: null, memberships: [] });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { activeOrganizationId: true },
    });

    if (!dbUser) {
      return NextResponse.json({ activeOrganizationId: null, memberships: [] });
    }

    const memberships = await prisma.organizationMembership.findMany({
      where: { userId: session.userId },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { joinedAt: "asc" },
    });

    return NextResponse.json({
      activeOrganizationId: dbUser.activeOrganizationId,
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
