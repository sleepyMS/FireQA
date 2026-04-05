import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { JobType } from "@/types/enums";
import { sanitizeFilename } from "@/lib/utils/sanitize-filename";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "api/export/markdown" });

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
        type: true,
        result: true,
        project: { select: { organizationId: true, name: true } },
      },
    });

    if (!job || job.project.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: "생성 결과를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (job.type !== JobType.SPEC_IMPROVE) {
      return NextResponse.json(
        { error: "기획서 개선 작업이 아닙니다." },
        { status: 400 }
      );
    }

    if (!job.result) {
      return NextResponse.json(
        { error: "아직 완료되지 않은 작업입니다." },
        { status: 400 }
      );
    }

    const parsed = JSON.parse(job.result) as { markdown?: string };

    if (typeof parsed.markdown !== "string") {
      return NextResponse.json({ error: "마크다운 데이터가 올바르지 않습니다." }, { status: 500 });
    }

    const safeProjectName = sanitizeFilename(job.project.name);

    return new NextResponse(parsed.markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeProjectName}-improved.md"`,
      },
    });
  } catch (error) {
    logger.error("Markdown 내보내기 오류", { error });
    return NextResponse.json(
      { error: "Markdown 내보내기에 실패했습니다." },
      { status: 500 }
    );
  }
}
