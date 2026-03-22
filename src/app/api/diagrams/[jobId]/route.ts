import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/diagrams/[jobId] - FigJam 플러그인이 호출하여 다이어그램 데이터를 가져감
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
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
