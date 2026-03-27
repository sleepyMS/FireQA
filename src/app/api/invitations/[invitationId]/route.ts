import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { requireRole } from "@/lib/auth/require-role";
import { UserRole, InviteStatus } from "@/types/enums";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const roleCheck = requireRole(user.role, UserRole.ADMIN);
  if (roleCheck) {
    return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });
  }

  const { invitationId } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation || invitation.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "초대를 찾을 수 없습니다." }, { status: 404 });
  }

  if (invitation.status !== InviteStatus.PENDING) {
    return NextResponse.json(
      { error: "대기 중인 초대만 취소할 수 있습니다." },
      { status: 400 }
    );
  }

  await prisma.invitation.update({
    where: { id: invitationId },
    data: { status: InviteStatus.CANCELLED },
  });

  return NextResponse.json({ success: true });
}
