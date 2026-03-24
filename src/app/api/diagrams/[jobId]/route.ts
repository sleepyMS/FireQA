import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";

// GET /api/diagrams/[jobId] - FigJam 플러그인이 호출하여 다이어그램 데이터를 가져감
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { jobId } = await params;

    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
      include: { project: true },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 사용자 조직 소속 확인
    if (job.project.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: "해당 데이터에 대한 권한이 없습니다." },
        { status: 403 }
      );
    }

    if (job.type !== "diagrams") {
      return NextResponse.json(
        { error: "다이어그램 타입의 Job이 아닙니다." },
        { status: 400 }
      );
    }

    if (job.status !== "completed" || !job.result) {
      return NextResponse.json(
        { error: "아직 생성이 완료되지 않았습니다.", status: job.status },
        { status: 202 }
      );
    }

    const result = JSON.parse(job.result);

    return NextResponse.json({
      jobId: job.id,
      projectName: job.project.name,
      status: job.status,
      diagrams: result.diagrams,
    });
  } catch (error) {
    console.error("다이어그램 데이터 조회 오류:", error);
    return NextResponse.json(
      { error: "데이터 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}
