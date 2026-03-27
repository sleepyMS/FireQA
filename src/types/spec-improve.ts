export interface SpecImproveSummary {
  totalSections: number;
  tableOfContents: string[];
  changeHighlights: string[];
}
export interface SpecImproveResult {
  markdown: string;
  summary: SpecImproveSummary;
}
