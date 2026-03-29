import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, updateCachedActiveOrg } from "@/lib/auth/get-current-user";

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { organizationId } = await request.json() as { organizationId?: string };
    if (!organizationId) {
      return NextResponse.json({ error: "organizationId가 필요합니다." }, { status: 400 });
    }

    const membership = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: { userId: user.userId, organizationId },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "해당 조직의 멤버가 아닙니다." },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.userId },
      data: { activeOrganizationId: organizationId },
    });

    // 전환된 조직을 캐시에 반영 (DB 재조회 없이)
    updateCachedActiveOrg(user.userId, organizationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("활성 조직 전환 오류:", error);
    return NextResponse.json({ error: "조직 전환에 실패했습니다." }, { status: 500 });
  }
}
