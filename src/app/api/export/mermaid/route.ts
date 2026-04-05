import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { JobType } from "@/types/enums";
import { sanitizeFilename } from "@/lib/utils/sanitize-filename";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "api/export/mermaid" });

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

    if (job.type !== JobType.DIAGRAMS) {
      return NextResponse.json(
        { error: "다이어그램 작업이 아닙니다." },
        { status: 400 }
      );
    }

    if (!job.result) {
      return NextResponse.json(
        { error: "아직 완료되지 않은 작업입니다." },
        { status: 400 }
      );
    }

    const parsed = JSON.parse(job.result) as { diagrams?: { title: string; mermaidCode: string }[] };

    if (!Array.isArray(parsed.diagrams)) {
      return NextResponse.json({ error: "다이어그램 데이터가 올바르지 않습니다." }, { status: 500 });
    }

    const mmdContent = parsed.diagrams
      .map((d) => `%% ${d.title}\n${d.mermaidCode}`)
      .join("\n\n");

    const safeProjectName = sanitizeFilename(job.project.name);

    return new NextResponse(mmdContent, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeProjectName}-diagrams.mmd"`,
      },
    });
  } catch (error) {
    logger.error("Mermaid 내보내기 오류", { error });
    return NextResponse.json(
      { error: "Mermaid 내보내기에 실패했습니다." },
      { status: 500 }
    );
  }
}
