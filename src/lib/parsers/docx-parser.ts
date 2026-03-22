import mammoth from "mammoth";
import type { ParsedDocument } from "@/types/document";

export async function parseDocx(
  buffer: Buffer,
  fileName: string
): Promise<ParsedDocument> {
  const result = await mammoth.extractRawText({ buffer });

  return {
    text: result.value,
    metadata: {
      fileName,
      fileType: "docx",
    },
  };
}
