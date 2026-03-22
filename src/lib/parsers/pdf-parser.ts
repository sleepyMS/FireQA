import type { ParsedDocument } from "@/types/document";

export async function parsePdf(
  buffer: Buffer,
  fileName: string
): Promise<ParsedDocument> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);

  return {
    text: data.text,
    metadata: {
      fileName,
      fileType: "pdf",
      pageCount: data.numpages,
    },
  };
}
