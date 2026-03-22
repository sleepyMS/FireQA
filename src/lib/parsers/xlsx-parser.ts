import ExcelJS from "exceljs";
import type { ParsedDocument } from "@/types/document";

export async function parseXlsx(
  buffer: Buffer,
  fileName: string
): Promise<ParsedDocument> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const sheetNames: string[] = [];
  const textParts: string[] = [];

  workbook.eachSheet((worksheet) => {
    sheetNames.push(worksheet.name);
    textParts.push(`=== ${worksheet.name} ===`);

    worksheet.eachRow((row) => {
      const values = row.values as ExcelJS.CellValue[];
      const cells = values
        .slice(1) // ExcelJS rows are 1-indexed
        .map((v): string => {
          if (v == null) return "";
          if (typeof v === "object" && v !== null) {
            const obj = v as unknown as Record<string, unknown>;
            if ("text" in obj) return String(obj.text);
          }
          return String(v);
        })
        .filter((v) => v && !v.startsWith("="));

      if (cells.some((c) => c.length > 0)) {
        textParts.push(cells.join(" | "));
      }
    });

    textParts.push("");
  });

  return {
    text: textParts.join("\n"),
    metadata: {
      fileName,
      fileType: "xlsx",
      sheetNames,
    },
  };
}
