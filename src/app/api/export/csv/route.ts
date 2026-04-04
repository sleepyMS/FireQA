import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { sanitizeFilename } from "@/lib/utils/sanitize-filename";
import { createLogger } from "@/lib/logger";
import type { TestSheet } from "@/types/test-case";

const logger = createLogger({ module: "api/export/csv" });

function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return '"' + field.replace(/"/g, '""') + '"';
  }
  return field;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const jobId = request.nextUrl.searchParams.get("jobId");
    if (!jobId) {
      return NextResponse.json(
        { error: "jobId가 필요합니다." },
        { status: 400 }
      );
    }

    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
      select: {
        result: true,
        project: { select: { organizationId: true, name: true } },
      },
    });

    if (!job || job.project.organizationId !== user.organizationId || !job.result) {
      return NextResponse.json(
        { error: "생성 결과를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const result = JSON.parse(job.result) as { sheets: TestSheet[] };
    const headers = [
      "시트명",
      "카테고리",
      "TC ID",
      "TC명",
      "대분류",
      "중분류",
      "소분류",
      "사전조건",
      "절차",
      "기대결과",
    ];

    const rows: string[] = [headers.map(escapeCsvField).join(",")];

    for (const sheet of result.sheets) {
      for (const tc of sheet.testCases) {
        const row = [
          sheet.sheetName,
          sheet.category ?? "",
          tc.tcId,
          tc.name,
          tc.depth1,
          tc.depth2,
          tc.depth3,
          tc.precondition,
          tc.procedure,
          tc.expectedResult,
        ].map(escapeCsvField);
        rows.push(row.join(","));
      }
    }

    const BOM = "\uFEFF";
    const csv = BOM + rows.join("\n");
    const safeProjectName = sanitizeFilename(job.project.name);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeProjectName}_QA_TC.csv"`,
      },
    });
  } catch (error) {
    logger.error("CSV 내보내기 오류", { error });
    return NextResponse.json(
      { error: "CSV 내보내기에 실패했습니다." },
      { status: 500 }
    );
  }
}
