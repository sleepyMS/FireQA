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

      // 삭제된 조직이 캐시에 남아 stale 데이터를 반환하지 않도록 무효화
      invalidateCachedUser(user.userId);
      return NextResponse.json({ success: true });
    }

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
      });

      await tx.user.update({
        where: { id: user.userId },
        data: { activeOrganizationId: remaining?.organizationId ?? null },
      });
    });

    // 탈퇴한 멤버십이 캐시에 남아 stale 데이터를 반환하지 않도록 무효화
    invalidateCachedUser(user.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("조직 탈퇴 오류:", error);
    return NextResponse.json({ error: "조직 탈퇴에 실패했습니다." }, { status: 500 });
  }
}
