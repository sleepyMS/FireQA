import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

    if (!job || !job.result || job.type !== "wireframes") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const result = JSON.parse(job.result);
    return NextResponse.json({
      jobId: job.id,
      projectName: job.project.name,
      screens: result.screens,
      flows: result.flows,
    });
  } catch (error) {
    console.error("와이어프레임 조회 오류:", error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}
