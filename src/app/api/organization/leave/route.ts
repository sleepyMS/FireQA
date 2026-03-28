import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { UserRole } from "@/types/enums";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    if (user.role === UserRole.OWNER) {
      const memberCount = await prisma.organizationMembership.count({
        where: { organizationId: user.organizationId },
      });

      if (memberCount > 1) {
        return NextResponse.json(
          { error: "소유권을 이전한 후 다시 시도하세요." },
          { status: 400 }
        );
      }

      // 유일한 멤버 + owner → 조직 전체 삭제 (CASCADE)
      await prisma.organization.delete({
        where: { id: user.organizationId },
      });

      return NextResponse.json({ success: true });
    }

    // owner 아닌 경우 → 멤버십만 삭제
    await prisma.$transaction(async (tx) => {
      await tx.organizationMembership.delete({
        where: {
          userId_organizationId: {
            userId: user.userId,
            organizationId: user.organizationId,
          },
        },
      });

      // 다른 멤버십이 있으면 첫 번째로 activeOrganizationId 업데이트
      const remaining = await tx.organizationMembership.findFirst({
        where: { userId: user.userId },
      });

      await tx.user.update({
        where: { id: user.userId },
        data: { activeOrganizationId: remaining?.organizationId ?? null },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("조직 탈퇴 오류:", error);
    return NextResponse.json({ error: "조직 탈퇴에 실패했습니다." }, { status: 500 });
  }
}
