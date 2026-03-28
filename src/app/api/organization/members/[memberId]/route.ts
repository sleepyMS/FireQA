import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { requireRole } from "@/lib/auth/require-role";
import { UserRole, ActivityAction } from "@/types/enums";
import { logActivity } from "@/lib/activity/log-activity";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const roleErr = requireRole(user.role, UserRole.ADMIN);
    if (roleErr) return NextResponse.json({ error: roleErr.error }, { status: roleErr.status });

    const { memberId } = await params;
    const { role } = await request.json() as { role: string };

    if (!Object.values(UserRole).includes(role as UserRole)) {
      return NextResponse.json({ error: "올바르지 않은 역할입니다." }, { status: 400 });
    }

    if (memberId === user.userId) {
      return NextResponse.json({ error: "자신의 역할은 변경할 수 없습니다." }, { status: 400 });
    }

    // owner 변경은 owner만 가능
    if (role === UserRole.OWNER && user.role !== UserRole.OWNER) {
      return NextResponse.json({ error: "소유자 권한이 필요합니다." }, { status: 403 });
    }

    const membership = await prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: memberId, organizationId: user.organizationId } },
    });
    if (!membership) return NextResponse.json({ error: "멤버를 찾을 수 없습니다." }, { status: 404 });

    // 마지막 owner 보호
    if (membership.role === UserRole.OWNER && role !== UserRole.OWNER) {
      const ownerCount = await prisma.organizationMembership.count({
        where: { organizationId: user.organizationId, role: UserRole.OWNER },
      });
      if (ownerCount <= 1) {
        return NextResponse.json({ error: "마지막 소유자의 역할은 변경할 수 없습니다." }, { status: 400 });
      }
    }

    await prisma.organizationMembership.update({
      where: { userId_organizationId: { userId: memberId, organizationId: user.organizationId } },
      data: { role },
    });
    logActivity({ organizationId: user.organizationId, actorId: user.userId, action: ActivityAction.MEMBER_ROLE_CHANGED, metadata: { targetUserId: memberId, newRole: role } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("역할 변경 오류:", error);
    return NextResponse.json({ error: "역할 변경에 실패했습니다." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const roleErr = requireRole(user.role, UserRole.ADMIN);
    if (roleErr) return NextResponse.json({ error: roleErr.error }, { status: roleErr.status });

    const { memberId } = await params;

    if (memberId === user.userId) {
      return NextResponse.json({ error: "자신은 제거할 수 없습니다. 탈퇴를 이용하세요." }, { status: 400 });
    }

    const membership = await prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: memberId, organizationId: user.organizationId } },
    });
    if (!membership) return NextResponse.json({ error: "멤버를 찾을 수 없습니다." }, { status: 404 });

    if (membership.role === UserRole.OWNER && user.role !== UserRole.OWNER) {
      return NextResponse.json({ error: "소유자를 제거하려면 소유자 권한이 필요합니다." }, { status: 403 });
    }

    // 마지막 owner 보호: owner가 1명뿐이면 삭제 불가
    if (membership.role === UserRole.OWNER) {
      const ownerCount = await prisma.organizationMembership.count({
        where: { organizationId: user.organizationId, role: UserRole.OWNER },
      });
      if (ownerCount <= 1) {
        return NextResponse.json({ error: "마지막 소유자는 제거할 수 없습니다." }, { status: 400 });
      }
    }

    await prisma.organizationMembership.delete({
      where: { userId_organizationId: { userId: memberId, organizationId: user.organizationId } },
    });
    logActivity({ organizationId: user.organizationId, actorId: user.userId, action: ActivityAction.MEMBER_REMOVED, metadata: { targetUserId: memberId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("멤버 제거 오류:", error);
    return NextResponse.json({ error: "멤버 제거에 실패했습니다." }, { status: 500 });
  }
}
