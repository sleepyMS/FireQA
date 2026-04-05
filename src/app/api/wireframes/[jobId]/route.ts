import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "api/wireframes/job" });

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
      select: {
        id: true,
        type: true,
        result: true,
        project: { select: { organizationId: true, name: true } },
      },
    });

    if (!job || !job.result || job.type !== "wireframes") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // 사용자 조직 소속 확인
    if (job.project.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: "해당 데이터에 대한 권한이 없습니다." },
        { status: 403 }
      );
    }

    const result = JSON.parse(job.result);
    return NextResponse.json({
      jobId: job.id,
      projectName: job.project.name,
      screens: result.screens,
      flows: result.flows,
    });
  } catch (error) {
    logger.error("와이어프레임 조회 오류", { error });
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}
