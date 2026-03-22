import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildExcelWorkbook } from "@/lib/excel/builder";

export async function GET(request: NextRequest) {
  try {
    const jobId = request.nextUrl.searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId가 필요합니다." },
        { status: 400 }
      );
    }

    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
      include: { project: true },
    });

    if (!job || !job.result) {
      return NextResponse.json(
        { error: "생성 결과를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const result = JSON.parse(job.result);
    const workbook = await buildExcelWorkbook(result.sheets);

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(job.project.name)}_QA_TC.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Excel 내보내기 오류:", error);
    return NextResponse.json(
      { error: "Excel 내보내기에 실패했습니다." },
      { status: 500 }
    );
  }
}
