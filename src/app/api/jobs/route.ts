import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";

// GET /api/jobs?type=diagrams - 완료된 Job 목록 (FigJam 플러그인 선택용)
// GET /api/jobs?all=1&type=test-cases - 이력 페이지용 전체 목록
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const type = request.nextUrl.searchParams.get("type");
    const all = request.nextUrl.searchParams.get("all");
    // projectId 필터 추가: 프로젝트 상세 페이지에서 해당 프로젝트의 Job만 조회
    const projectId = request.nextUrl.searchParams.get("projectId");

    if (all) {
      // 이력 페이지용: 모든 상태의 Job 목록
      const jobs = await prisma.generationJob.findMany({
        where: {
          project: { organizationId: user.organizationId },
          ...(projectId ? { projectId } : {}),
          ...(type ? { type } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: { project: true, upload: true },
        take: 50,
      });

      return NextResponse.json({ jobs });
    }

    // FigJam 플러그인용: 완료된 Job만
    const jobs = await prisma.generationJob.findMany({
      where: {
        status: "completed",
        project: { organizationId: user.organizationId },
        ...(type ? { type } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { project: true, upload: true },
    });

    return NextResponse.json({
      jobs: jobs.map((job) => ({
        id: job.id,
        projectName: job.project.name,
        fileName: job.upload.fileName,
        type: job.type,
        createdAt: job.createdAt,
      })),
    });
  } catch (error) {
    console.error("Job 목록 조회 오류:", error);
    return NextResponse.json(
      { error: "목록 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// PATCH /api/jobs - 프로젝트명 수정
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id, projectName } = await request.json();

    if (!id || !projectName?.trim()) {
      return NextResponse.json(
        { error: "ID와 프로젝트명은 필수입니다." },
        { status: 400 }
      );
    }

    const job = await prisma.generationJob.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!job) {
      return NextResponse.json(
        { error: "해당 이력을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (job.project.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: "해당 이력에 대한 권한이 없습니다." },
        { status: 403 }
      );
    }

    await prisma.project.update({
      where: { id: job.projectId },
      data: { name: projectName.trim() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("프로젝트명 수정 오류:", error);
    return NextResponse.json(
      { error: "수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/jobs - Job 삭제 (연결된 Upload만 cascade 삭제; Project는 유지)
// 프로젝트는 first-class entity이므로 마지막 Job을 삭제해도 프로젝트는 삭제하지 않는다.
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "ID는 필수입니다." },
        { status: 400 }
      );
    }

    const job = await prisma.generationJob.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!job) {
      return NextResponse.json(
        { error: "해당 이력을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 사용자 조직 소속 확인
    if (job.project.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: "해당 이력에 대한 권한이 없습니다." },
        { status: 403 }
      );
    }

    // Job만 삭제 (Upload는 onDelete: Cascade로 함께 삭제됨)
    await prisma.generationJob.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("이력 삭제 오류:", error);
    return NextResponse.json(
      { error: "삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
