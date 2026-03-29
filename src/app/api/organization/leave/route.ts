import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, invalidateCachedUser } from "@/lib/auth/get-current-user";
import { UserRole } from "@/types/enums";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    if (user.role === UserRole.OWNER) {
      // CASCADE로 멤버십, 프로젝트 등 관련 데이터 일괄 삭제
      await prisma.organization.delete({
        where: { id: user.organizationId },
      });

      invalidateCachedUser(user.userId);

      // 삭제 후 이동할 조직 탐색 (다른 조직이 있으면 거기로, 없으면 온보딩)
      const remaining = await prisma.organizationMembership.findFirst({
        where: { userId: user.userId },
        include: { organization: { select: { slug: true } } },
      });
      const redirectTo = remaining ? `/${remaining.organization.slug}/dashboard` : "/onboarding";

      return NextResponse.json({ success: true, redirectTo });
    }

    let remainingSlug: string | null = null;

    await prisma.$transaction(async (tx) => {
      await tx.organizationMembership.delete({
        where: {
          userId_organizationId: {
            userId: user.userId,
            organizationId: user.organizationId,
          },
        },
      });

      const remaining = await tx.organizationMembership.findFirst({
        where: { userId: user.userId },
        include: { organization: { select: { slug: true } } },
      });

      await tx.user.update({
        where: { id: user.userId },
        data: { activeOrganizationId: remaining?.organizationId ?? null },
      });

      remainingSlug = remaining?.organization.slug ?? null;
    });

    invalidateCachedUser(user.userId);

    const redirectTo = remainingSlug ? `/${remainingSlug}/dashboard` : "/onboarding";
    return NextResponse.json({ success: true, redirectTo });
  } catch (error) {
    console.error("조직 탈퇴 오류:", error);
    return NextResponse.json({ error: "조직 탈퇴에 실패했습니다." }, { status: 500 });
  }
}
