/**
 * @본문에서 @이름 멘션을 추출한다.
 * 한글, 영문, 숫자, 언더스코어를 지원하며 중복을 제거한다.
 */
const MENTION_RE = /@([\w가-힣]+)/g;

export function parseMentions(text: string): string[] {
  const matches = text.matchAll(MENTION_RE);
  const names = new Set<string>();
  for (const m of matches) {
    names.add(m[1]);
  }
  return [...names];
}
