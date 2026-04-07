/**
 * Figma URL 또는 파일 키에서 file key만 추출한다.
 * - https://www.figma.com/design/ABC123/Name → ABC123
 * - https://www.figma.com/file/ABC123/Name  → ABC123
 * - ABC123 (이미 키) → ABC123
 */
export function extractFigmaFileKey(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/figma\.com\/(?:design|file)\/([A-Za-z0-9]+)/);
  return match ? match[1] : trimmed;
}
