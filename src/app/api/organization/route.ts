import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { requireRole } from "@/lib/auth/require-role";
import { UserRole } from "@/types/enums";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      include: { _count: { select: { users: true } } },
    });

    if (!org) {
      return NextResponse.json({ error: "조직을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      memberCount: org._count.users,
    });
  } catch (error) {
    console.error("조직 정보 조회 오류:", error);
    return NextResponse.json({ error: "조직 정보 조회에 실패했습니다." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const roleErr = requireRole(user.role, UserRole.ADMIN);
    if (roleErr) {
      return NextResponse.json({ error: roleErr.error }, { status: roleErr.status });
    }

    const body = await request.json();
    const { name, slug } = body as { name?: string; slug?: string };

    if (name !== undefined && !name.trim()) {
      return NextResponse.json({ error: "조직 이름은 비워둘 수 없습니다." }, { status: 400 });
    }

    if (slug !== undefined && !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "슬러그는 소문자, 숫자, 하이픈만 사용할 수 있습니다." },
        { status: 400 }
      );
    }

    if (slug !== undefined) {
      const existing = await prisma.organization.findUnique({ where: { slug } });
      if (existing && existing.id !== user.organizationId) {
        return NextResponse.json({ error: "이미 사용 중인 슬러그입니다." }, { status: 409 });
      }
    }

    const data: Record<string, string> = {};
    if (name !== undefined) data.name = name.trim();
    if (slug !== undefined) data.slug = slug;

    const updated = await prisma.organization.update({
      where: { id: user.organizationId },
      data,
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      plan: updated.plan,
    });
  } catch (error) {
    console.error("조직 정보 수정 오류:", error);
    return NextResponse.json({ error: "조직 정보 수정에 실패했습니다." }, { status: 500 });
  }
}
