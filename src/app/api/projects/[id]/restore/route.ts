import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/projects/[id]/restore — 소프트 삭제된 프로젝트 복구
export async function POST(request: NextRequest, { params }: RouteContext) {
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
