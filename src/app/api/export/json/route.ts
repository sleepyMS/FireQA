import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "api/export/json" });

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const jobId = request.nextUrl.searchParams.get("jobId");
    if (!jobId) {
      return NextResponse.json({ error: "jobId가 필요합니다." }, { status: 400 });
    }

    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
      select: {
        result: true,
        project: { select: { organizationId: true } },
      },
    });

    if (!job || job.project.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: "생성 결과를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (!job.result) {
      return NextResponse.json(
        { error: "아직 완료되지 않은 작업입니다." },
        { status: 400 }
      );
    }

    return new NextResponse(job.result, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="result-${jobId}.json"`,
      },
    });
  } catch (error) {
    logger.error("JSON 내보내기 오류", { error });
    return NextResponse.json(
      { error: "JSON 내보내기에 실패했습니다." },
      { status: 500 }
    );
  }
}
