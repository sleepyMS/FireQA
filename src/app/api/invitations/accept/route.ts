import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { InviteStatus } from "@/types/enums";
import { createHash } from "crypto";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { token } = await request.json();
  if (!token) {
    return NextResponse.json({ error: "토큰이 필요합니다." }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash },
  });

  if (!invitation || invitation.status !== InviteStatus.PENDING || invitation.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "유효하지 않거나 만료된 초대입니다." },
      { status: 400 }
    );
  }

  if (user.organizationId === invitation.organizationId) {
    return NextResponse.json(
      { error: "이미 해당 조직의 멤버입니다." },
      { status: 409 }
    );
  }

  const oldOrgId = user.organizationId;

  await prisma.$transaction(async (tx) => {
    const memberCount = await tx.user.count({
      where: { organizationId: oldOrgId },
    });

    // 사용자를 새 조직으로 이동한 뒤 기존 조직 삭제 (cascade 순서 보장)
    await tx.user.update({
      where: { id: user.userId },
      data: {
        organizationId: invitation.organizationId,
        role: invitation.role,
      },
    });

    if (memberCount === 1) {
      await tx.organization.delete({ where: { id: oldOrgId } });
    }

    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        status: InviteStatus.ACCEPTED,
        acceptedById: user.userId,
      },
    });
  });

  return NextResponse.json({ success: true });
}
