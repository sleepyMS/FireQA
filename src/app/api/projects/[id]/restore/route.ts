import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { requireRole } from "@/lib/auth/require-role";
import { UserRole } from "@/types/enums";
import { getOrgProject } from "@/lib/projects/get-org-project";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/projects/[id]/restore — 소프트 삭제된 프로젝트 복구
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 복구는 admin 이상 권한 필요
    const roleErr = requireRole(user.role, UserRole.ADMIN);
    if (roleErr) return NextResponse.json({ error: roleErr.error }, { status: roleErr.status });

    const { id } = await params;

    const project = await getOrgProject(id, user.organizationId);
    if (!project) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
    }

    if (project.status !== "deleted") {
      return NextResponse.json(
        { error: "삭제된 프로젝트만 복구할 수 있습니다." },
        { status: 400 }
      );
    }

    await prisma.project.update({
      where: { id },
      data: { deletedAt: null, status: "active" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("프로젝트 복구 오류:", error);
    return NextResponse.json({ error: "복구에 실패했습니다." }, { status: 500 });
  }
}
