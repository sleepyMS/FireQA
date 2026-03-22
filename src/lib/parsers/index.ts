import type { ParsedDocument } from "@/types/document";
import { parsePdf } from "./pdf-parser";
import { parseDocx } from "./docx-parser";
import { parseXlsx } from "./xlsx-parser";

export async function parseDocument(
  buffer: Buffer,
  fileName: string,
  fileType: string
): Promise<ParsedDocument> {
  const ext = fileName.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "pdf":
      return parsePdf(buffer, fileName);
    case "docx":
      return parseDocx(buffer, fileName);
    case "xlsx":
      return parseXlsx(buffer, fileName);
    case "txt":
    case "md":
      return {
        text: buffer.toString("utf-8"),
        metadata: { fileName, fileType },
      };
    default:
      throw new Error(`지원하지 않는 파일 형식: ${ext}`);
  }
}
