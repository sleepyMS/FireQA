import ExcelJS from "exceljs";
import type { TestSheet } from "@/types/test-case";
import {
  HEADER_FILL,
  HEADER_FONT,
  CELL_FONT,
  THIN_BORDER,
  EVEN_ROW_FILL,
  SUMMARY_HEADER_FILL,
} from "./styles";

const TC_COLUMNS = [
  { header: "TC ID", key: "tcId", width: 12 },
  { header: "테스트케이스 명", key: "name", width: 22 },
  { header: "1Depth", key: "depth1", width: 15 },
  { header: "2Depth", key: "depth2", width: 15 },
  { header: "3Depth", key: "depth3", width: 15 },
  { header: "사전조건", key: "precondition", width: 25 },
  { header: "테스트 절차", key: "procedure", width: 35 },
  { header: "기대결과", key: "expectedResult", width: 35 },
  { header: "테스트 결과\n크롬", key: "resultChrome", width: 12 },
  { header: "테스트 결과\nAndroid", key: "resultAndroid", width: 12 },
  { header: "테스트 결과\niOS", key: "resultIos", width: 12 },
  { header: "결함 (JIRA)", key: "defect", width: 15 },
  { header: "결함내용", key: "defectDetail", width: 20 },
  { header: "비고", key: "note", width: 15 },
];

// Excel 시트 이름에서 금지 문자 제거 (* ? : \ / [ ]) 및 31자 제한
function sanitizeSheetName(name: string): string {
  return name.replace(/[*?:\\/\[\]]/g, "_").slice(0, 31);
}

export async function buildExcelWorkbook(
  sheets: TestSheet[]
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FireQA";
  workbook.created = new Date();

  // 1. Summary sheet (목차)
  buildSummarySheet(workbook, sheets);

  // 2. TC sheets
  for (const sheet of sheets) {
    buildTCSheet(workbook, sheet);
  }

  return workbook;
}

function buildSummarySheet(workbook: ExcelJS.Workbook, sheets: TestSheet[]) {
  const ws = workbook.addWorksheet("목차");

  // Title
  ws.mergeCells("A1:F1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "QA 테스트케이스 요약";
  titleCell.font = { bold: true, size: 14, name: "맑은 고딕" };

  // Headers
  const headers = ["구분", "TC 합계", "PASS", "FAIL", "N/T", "N/A"];
  const headerRow = ws.getRow(3);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.fill = SUMMARY_HEADER_FILL;
    cell.font = { ...HEADER_FONT, size: 11 };
    cell.border = THIN_BORDER;
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  // Data rows
  let totalTCs = 0;
  sheets.forEach((sheet, idx) => {
    const row = ws.getRow(idx + 4);
    row.getCell(1).value = sheet.sheetName;
    row.getCell(1).font = CELL_FONT;
    row.getCell(2).value = sheet.testCases.length;
    // PASS, FAIL, N/T, N/A are 0 by default (to be filled by QA)
    for (let c = 3; c <= 6; c++) {
      row.getCell(c).value = 0;
    }
    for (let c = 1; c <= 6; c++) {
      row.getCell(c).border = THIN_BORDER;
      row.getCell(c).alignment = {
        horizontal: c === 1 ? "left" : "center",
        vertical: "middle",
      };
    }
    if (idx % 2 === 0) {
      for (let c = 1; c <= 6; c++) {
        row.getCell(c).fill = EVEN_ROW_FILL;
      }
    }
    totalTCs += sheet.testCases.length;
  });

  // Total row
  const totalRow = ws.getRow(sheets.length + 4);
  totalRow.getCell(1).value = "합계";
  totalRow.getCell(1).font = { ...CELL_FONT, bold: true };
  totalRow.getCell(2).value = totalTCs;
  totalRow.getCell(2).font = { ...CELL_FONT, bold: true };
  for (let c = 1; c <= 6; c++) {
    totalRow.getCell(c).border = THIN_BORDER;
    totalRow.getCell(c).alignment = {
      horizontal: c === 1 ? "left" : "center",
      vertical: "middle",
    };
  }

  // Column widths
  ws.getColumn(1).width = 30;
  for (let c = 2; c <= 6; c++) {
    ws.getColumn(c).width = 12;
  }
}

function buildTCSheet(workbook: ExcelJS.Workbook, sheet: TestSheet) {
  const ws = workbook.addWorksheet(sanitizeSheetName(sheet.sheetName));

  // Column definitions
  ws.columns = TC_COLUMNS.map((col) => ({
    key: col.key,
    width: col.width,
  }));

  // Header row
  const headerRow = ws.getRow(1);
  TC_COLUMNS.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.border = THIN_BORDER;
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
  });
  headerRow.height = 30;

  // Data rows
  sheet.testCases.forEach((tc, idx) => {
    const row = ws.getRow(idx + 2);
    row.getCell(1).value = tc.tcId;
    row.getCell(2).value = tc.name;
    row.getCell(3).value = tc.depth1;
    row.getCell(4).value = tc.depth2;
    row.getCell(5).value = tc.depth3;
    row.getCell(6).value = tc.precondition;
    row.getCell(7).value = tc.procedure;
    row.getCell(8).value = tc.expectedResult;
    // Columns 9-14 left empty for manual QA input

    for (let c = 1; c <= 14; c++) {
      const cell = row.getCell(c);
      cell.font = CELL_FONT;
      cell.border = THIN_BORDER;
      cell.alignment = { vertical: "top", wrapText: true };
    }

    if (idx % 2 === 1) {
      for (let c = 1; c <= 14; c++) {
        row.getCell(c).fill = EVEN_ROW_FILL;
      }
    }
  });

  // Freeze panes
  ws.views = [{ state: "frozen", ySplit: 1 }];
}
