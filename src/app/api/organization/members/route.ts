import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const memberships = await prisma.organizationMembership.findMany({
      where: { organizationId: user.organizationId },
      include: {
        user: { select: { id: true, name: true, email: true, createdAt: true } },
      },
      orderBy: { joinedAt: "asc" },
    });

    return NextResponse.json({
      members: memberships.map((m) => ({
        id: m.user.id,
        name: m.user.name ?? m.user.email,
        email: m.user.email,
        role: m.role,
        createdAt: m.joinedAt,
      })),
    });
  } catch (error) {
    console.error("멤버 목록 조회 오류:", error);
    return NextResponse.json({ error: "멤버 목록 조회에 실패했습니다." }, { status: 500 });
  }
}
