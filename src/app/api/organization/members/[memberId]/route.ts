import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { requireRole } from "@/lib/auth/require-role";
import { UserRole } from "@/types/enums";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const roleErr = requireRole(user.role, UserRole.ADMIN);
    if (roleErr) {
      return NextResponse.json({ error: roleErr.error }, { status: roleErr.status });
    }

    const { memberId } = await params;
    const { role } = (await request.json()) as { role: string };

    if (!role || ![UserRole.OWNER, UserRole.ADMIN, UserRole.MEMBER].includes(role as UserRole)) {
      return NextResponse.json({ error: "유효하지 않은 역할입니다." }, { status: 400 });
    }

    if (memberId === user.userId) {
      return NextResponse.json({ error: "자신의 역할은 변경할 수 없습니다." }, { status: 400 });
    }

    const target = await prisma.user.findFirst({
      where: { id: memberId, organizationId: user.organizationId },
    });

    if (!target) {
      return NextResponse.json({ error: "멤버를 찾을 수 없습니다." }, { status: 404 });
    }

    if (target.role === UserRole.OWNER && user.role !== UserRole.OWNER) {
      return NextResponse.json({ error: "소유자의 역할은 소유자만 변경할 수 있습니다." }, { status: 403 });
    }

    if (target.role === UserRole.OWNER && role !== UserRole.OWNER) {
      const ownerCount = await prisma.user.count({
        where: { organizationId: user.organizationId, role: UserRole.OWNER },
      });
      if (ownerCount <= 1) {
        return NextResponse.json({ error: "마지막 소유자의 역할은 변경할 수 없습니다." }, { status: 400 });
      }
    }

    const updated = await prisma.user.update({
      where: { id: memberId },
      data: { role },
    });

    return NextResponse.json({ id: updated.id, role: updated.role });
  } catch (error) {
    console.error("멤버 역할 변경 오류:", error);
    return NextResponse.json({ error: "멤버 역할 변경에 실패했습니다." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const roleErr = requireRole(user.role, UserRole.ADMIN);
    if (roleErr) {
      return NextResponse.json({ error: roleErr.error }, { status: roleErr.status });
    }

    const { memberId } = await params;

    if (memberId === user.userId) {
      return NextResponse.json({ error: "자신을 제거할 수 없습니다. 조직 탈퇴를 이용하세요." }, { status: 400 });
    }

    const target = await prisma.user.findFirst({
      where: { id: memberId, organizationId: user.organizationId },
    });

    if (!target) {
      return NextResponse.json({ error: "멤버를 찾을 수 없습니다." }, { status: 404 });
    }

    if (target.role === UserRole.OWNER && user.role !== UserRole.OWNER) {
      return NextResponse.json({ error: "소유자는 소유자만 제거할 수 있습니다." }, { status: 403 });
    }

    if (target.role === UserRole.OWNER) {
      const ownerCount = await prisma.user.count({
        where: { organizationId: user.organizationId, role: UserRole.OWNER },
      });
      if (ownerCount <= 1) {
        return NextResponse.json({ error: "마지막 소유자는 제거할 수 없습니다." }, { status: 400 });
      }
    }

    await prisma.user.delete({ where: { id: memberId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("멤버 제거 오류:", error);
    return NextResponse.json({ error: "멤버 제거에 실패했습니다." }, { status: 500 });
  }
}
