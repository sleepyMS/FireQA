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

  await prisma.$transaction(async (tx) => {
    // 현재 조직에 사용자 혼자만 남아있으면 조직 삭제
    const memberCount = await tx.user.count({
      where: { organizationId: user.organizationId },
    });
    if (memberCount === 1) {
      await tx.organization.delete({
        where: { id: user.organizationId },
      });
    }

    await tx.user.update({
      where: { id: user.userId },
      data: {
        organizationId: invitation.organizationId,
        role: invitation.role,
      },
    });

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
