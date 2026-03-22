export interface ParsedDocument {
  text: string;
  metadata: {
    fileName: string;
    fileType: string;
    pageCount?: number;
    sheetNames?: string[];
  };
}
