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
      const memberCount = await prisma.user.count({
        where: { organizationId: user.organizationId },
      });

      if (memberCount > 1) {
        return NextResponse.json(
          { error: "소유권을 이전한 후 다시 시도하세요." },
          { status: 400 }
        );
      }

      // 유일한 멤버이므로 조직 전체 삭제 (cascade)
      await prisma.organization.delete({
        where: { id: user.organizationId },
      });

      return NextResponse.json({ success: true });
    }

    await prisma.user.delete({ where: { id: user.userId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("조직 탈퇴 오류:", error);
    return NextResponse.json({ error: "조직 탈퇴에 실패했습니다." }, { status: 500 });
  }
}
