/** 슬러그 유효성 검사 regex (소문자·숫자·하이픈, 하이픈으로 시작·끝 불가) */
export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

/** 이름 → URL slug 변환 (fallback 없음 — 빈 결과 가능, UI용) */
export function deriveOrgSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 48)
    .replace(/^-+|-+$/g, "");
}
