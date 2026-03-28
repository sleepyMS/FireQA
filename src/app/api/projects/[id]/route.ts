import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";

type RouteContext = { params: Promise<{ id: string }> };

// 조직 소속 프로젝트를 조회하는 공통 헬퍼 (없거나 다른 조직이면 null)
async function getOrgProject(projectId: string, organizationId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project || project.organizationId !== organizationId) return null;
  return project;
}

// GET /api/projects/[id] — 프로젝트 상세
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: { select: { jobs: true, uploads: true } },
        jobs: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            type: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!project || project.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      archivedAt: project.archivedAt,
      deletedAt: project.deletedAt,
      _count: project._count,
      recentJobs: project.jobs,
    });
  } catch (error) {
    console.error("프로젝트 상세 조회 오류:", error);
    return NextResponse.json({ error: "조회에 실패했습니다." }, { status: 500 });
  }
}

// PATCH /api/projects/[id] — 이름/설명 수정
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;

    const project = await getOrgProject(id, user.organizationId);
    if (!project) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
    }

    const body = await request.json();
    const { name, description } = body as { name?: string; description?: string };

    if (name === undefined && description === undefined) {
      return NextResponse.json(
        { error: "수정할 필드(name 또는 description)가 필요합니다." },
        { status: 400 }
      );
    }

    if (name !== undefined && !name.trim()) {
      return NextResponse.json({ error: "프로젝트 이름은 비워둘 수 없습니다." }, { status: 400 });
    }

    const data: { name?: string; description?: string | null } = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description.trim() || null;

    const updated = await prisma.project.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      status: updated.status,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error("프로젝트 수정 오류:", error);
    return NextResponse.json({ error: "수정에 실패했습니다." }, { status: 500 });
  }
}

// DELETE /api/projects/[id] — 소프트 삭제
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;

    const project = await getOrgProject(id, user.organizationId);
    if (!project) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
    }

    await prisma.project.update({
      where: { id },
      data: { deletedAt: new Date(), status: "deleted" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("프로젝트 삭제 오류:", error);
    return NextResponse.json({ error: "삭제에 실패했습니다." }, { status: 500 });
  }
}
