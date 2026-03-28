import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { requireRole } from "@/lib/auth/require-role";
import { UserRole, InviteStatus, ActivityAction, PLAN_LABEL } from "@/types/enums";
import { randomBytes, createHash } from "crypto";
import { logActivity } from "@/lib/activity/log-activity";
import { getOrgPlan } from "@/lib/billing/get-org-plan";
import { getPlanLimits } from "@/lib/billing/plan-limits";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const roleCheck = requireRole(user.role, UserRole.ADMIN);
  if (roleCheck) {
    return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });
  }

  const invitations = await prisma.invitation.findMany({
    where: {
      organizationId: user.organizationId,
      status: InviteStatus.PENDING,
      expiresAt: { gt: new Date() },
    },
    include: {
      invitedBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    invitations: invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      invitedBy: inv.invitedBy,
    })),
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const roleCheck = requireRole(user.role, UserRole.ADMIN);
  if (roleCheck) {
    return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });
  }

  const body = await request.json();
  const role = body.role ?? UserRole.MEMBER;
  const email: string | undefined = body.email;
  const expiresInHours: number = body.expiresInHours ?? 72;

  const [plan, memberCount] = await Promise.all([
    getOrgPlan(user.organizationId),
    prisma.organizationMembership.count({ where: { organizationId: user.organizationId } }),
  ]);
  const limits = getPlanLimits(plan);
  if (limits.membersMax !== Infinity && memberCount >= limits.membersMax) {
    return NextResponse.json(
      { error: `${PLAN_LABEL[plan] ?? plan} 플랜의 멤버 한도(${limits.membersMax}명)에 도달했습니다. 플랜을 업그레이드하세요.` },
      { status: 403 }
    );
  }

  if (email) {
    const existing = await prisma.invitation.findFirst({
      where: {
        organizationId: user.organizationId,
        email,
        status: InviteStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "해당 이메일에 유효한 초대가 이미 존재합니다." },
        { status: 409 }
      );
    }
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const invitation = await prisma.invitation.create({
    data: {
      organizationId: user.organizationId,
      email: email ?? null,
      role,
      tokenHash,
      status: InviteStatus.PENDING,
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
      invitedById: user.userId,
    },
  });

  logActivity({ organizationId: user.organizationId, actorId: user.userId, action: ActivityAction.MEMBER_INVITED, metadata: { email: email ?? null, role } });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return NextResponse.json({
    inviteUrl: `${baseUrl}/invite?token=${rawToken}`,
    token: rawToken,
    id: invitation.id,
    expiresAt: invitation.expiresAt,
  });
}
