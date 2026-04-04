import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createLogger } from "@/lib/logger";
import type { TestSheet } from "@/types/test-case";

const logger = createLogger({ module: "api/export/pdf" });

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}

function buildPrintableHtml(projectName: string, sheets: TestSheet[]): string {
  const totalTCs = sheets.reduce((sum, s) => sum + s.testCases.length, 0);
  const now = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const sheetTables = sheets
    .map((sheet) => {
      const rows = sheet.testCases
        .map(
          (tc) => `
        <tr>
          <td>${escapeHtml(tc.tcId)}</td>
          <td>${escapeHtml(tc.name)}</td>
          <td>${escapeHtml(tc.depth1)}</td>
          <td>${escapeHtml(tc.depth2)}</td>
          <td>${escapeHtml(tc.depth3)}</td>
          <td>${escapeHtml(tc.precondition)}</td>
          <td>${escapeHtml(tc.procedure)}</td>
          <td>${escapeHtml(tc.expectedResult)}</td>
        </tr>`
        )
        .join("");

      return `
      <div class="sheet-section">
        <h2>${escapeHtml(sheet.sheetName)}${sheet.category ? ` <span class="category">(${escapeHtml(sheet.category)})</span>` : ""}</h2>
        <p class="tc-count">${sheet.testCases.length}개 TC</p>
        <table>
          <thead>
            <tr>
              <th style="width:7%">TC ID</th>
              <th style="width:12%">TC명</th>
              <th style="width:9%">대분류</th>
              <th style="width:9%">중분류</th>
              <th style="width:9%">소분류</th>
              <th style="width:16%">사전조건</th>
              <th style="width:19%">절차</th>
              <th style="width:19%">기대결과</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(projectName)} - QA 테스트케이스</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, "Malgun Gothic", "맑은 고딕", sans-serif; font-size: 11px; color: #222; padding: 20px; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 12px; }
    .header h1 { font-size: 18px; margin-bottom: 4px; }
    .header .meta { font-size: 11px; color: #666; }
    .sheet-section { margin-bottom: 28px; page-break-inside: avoid; }
    .sheet-section h2 { font-size: 14px; margin-bottom: 4px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    .sheet-section .category { font-weight: normal; color: #666; font-size: 12px; }
    .tc-count { font-size: 11px; color: #888; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; table-layout: fixed; }
    th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; vertical-align: top; word-wrap: break-word; overflow-wrap: break-word; }
    th { background: #f5f5f5; font-weight: 600; white-space: nowrap; }
    tr:nth-child(even) { background: #fafafa; }
    .no-print { text-align: center; margin-bottom: 20px; }
    .no-print button { padding: 8px 24px; font-size: 14px; background: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer; }
    .no-print button:hover { background: #1d4ed8; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
      .sheet-section { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
      @page { size: landscape; margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()">PDF로 인쇄 / 저장</button>
  </div>
  <div class="header">
    <h1>${escapeHtml(projectName)} - QA 테스트케이스</h1>
    <div class="meta">총 ${totalTCs}개 TC &middot; ${sheets.length}개 시트 &middot; 생성일: ${now}</div>
  </div>
  ${sheetTables}
</body>
</html>`;
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
    const html = buildPrintableHtml(job.project.name, result.sheets);

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    logger.error("PDF 내보내기 오류", { error });
    return NextResponse.json(
      { error: "PDF 내보내기에 실패했습니다." },
      { status: 500 }
    );
  }
}
