import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/projects/[id]/archive — 보관/해제 토글
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project || project.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
    }

    if (project.status === "deleted") {
      return NextResponse.json(
        { error: "삭제된 프로젝트는 보관 상태를 변경할 수 없습니다." },
        { status: 400 }
      );
    }

    // active → archived, archived → active 토글
    const isArchived = project.status === "archived";
    const updated = await prisma.project.update({
      where: { id },
      data: {
        status: isArchived ? "active" : "archived",
        archivedAt: isArchived ? null : new Date(),
      },
    });

    return NextResponse.json({
      status: updated.status,
      archivedAt: updated.archivedAt,
    });
  } catch (error) {
    console.error("프로젝트 보관 처리 오류:", error);
    return NextResponse.json({ error: "보관 처리에 실패했습니다." }, { status: 500 });
  }
}
