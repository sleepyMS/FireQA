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

  if (
    !invitation ||
    invitation.status !== InviteStatus.PENDING ||
    invitation.expiresAt < new Date()
  ) {
    return NextResponse.json(
      { error: "유효하지 않거나 만료된 초대입니다." },
      { status: 400 }
    );
  }

  const existingMembership = await prisma.organizationMembership.findUnique({
    where: {
      userId_organizationId: {
        userId: user.userId,
        organizationId: invitation.organizationId,
      },
    },
  });
  if (existingMembership) {
    return NextResponse.json(
      { error: "이미 해당 조직의 멤버입니다." },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.organizationMembership.create({
      data: {
        userId: user.userId,
        organizationId: invitation.organizationId,
        role: invitation.role,
      },
    });

    await tx.user.update({
      where: { id: user.userId },
      data: { activeOrganizationId: invitation.organizationId },
    });

    // 기존 조직 단독 owner이면 빈 조직이 되므로 삭제
    const oldMemberCount = await tx.organizationMembership.count({
      where: { organizationId: user.organizationId },
    });
    if (oldMemberCount === 1) {
      await tx.organization.delete({ where: { id: user.organizationId } });
    }

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: InviteStatus.ACCEPTED, acceptedById: user.userId },
    });
  });

  return NextResponse.json({ success: true });
}
