import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { InviteStatus } from "@/types/enums";
import { createHash } from "crypto";

export async function GET(request: NextRequest) {
  const rawToken = request.nextUrl.searchParams.get("token");
  if (!rawToken) {
    return NextResponse.json({ valid: false, reason: "토큰이 필요합니다." });
  }

  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash },
    include: { organization: { select: { name: true } } },
  });

  if (!invitation) {
    return NextResponse.json({ valid: false, reason: "유효하지 않은 초대입니다." });
  }

  if (invitation.status !== InviteStatus.PENDING) {
    return NextResponse.json({ valid: false, reason: "이미 처리된 초대입니다." });
  }

  if (invitation.expiresAt < new Date()) {
    return NextResponse.json({ valid: false, reason: "만료된 초대입니다." });
  }

  return NextResponse.json({
    valid: true,
    organizationName: invitation.organization.name,
    role: invitation.role,
    email: invitation.email,
    expiresAt: invitation.expiresAt.toISOString(),
  });
}
