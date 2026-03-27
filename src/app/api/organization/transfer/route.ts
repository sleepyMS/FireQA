import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { requireRole } from "@/lib/auth/require-role";
import { UserRole } from "@/types/enums";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const roleErr = requireRole(user.role, UserRole.OWNER);
    if (roleErr) {
      return NextResponse.json({ error: roleErr.error }, { status: roleErr.status });
    }

    const { targetUserId } = (await request.json()) as { targetUserId: string };

    if (!targetUserId) {
      return NextResponse.json({ error: "대상 사용자 ID는 필수입니다." }, { status: 400 });
    }

    if (targetUserId === user.userId) {
      return NextResponse.json({ error: "자신에게 소유권을 이전할 수 없습니다." }, { status: 400 });
    }

    const target = await prisma.user.findFirst({
      where: { id: targetUserId, organizationId: user.organizationId },
    });

    if (!target) {
      return NextResponse.json({ error: "대상 멤버를 찾을 수 없습니다." }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: targetUserId },
        data: { role: UserRole.OWNER },
      }),
      prisma.user.update({
        where: { id: user.userId },
        data: { role: UserRole.ADMIN },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("소유권 이전 오류:", error);
    return NextResponse.json({ error: "소유권 이전에 실패했습니다." }, { status: 500 });
  }
}
