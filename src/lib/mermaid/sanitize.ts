// Mermaid 구문에서 파싱 에러를 일으키는 패턴을 자동 수정
export function sanitizeMermaid(code: string): string {
  let result = code;

  // (( )) 이중괄호 안의 한국어 레이블에 내부 괄호가 있으면 수정
  result = result.replace(
    /\(\(([^)]*?\([^)]*?\)[^)]*?)\)\)/g,
    (_, inner) => {
      const cleaned = inner.replace(/\(/g, " - ").replace(/\)/g, "");
      return `(["${cleaned.trim()}"])`;
    }
  );

  // 남은 (( )) 에 한국어가 있으면 (["..."]) 로 변환
  result = result.replace(
    /\(\(([^)]*[가-힣][^)]*)\)\)/g,
    (_, inner) => `(["${inner.trim()}"])`
  );

  // [ ] 안에 괄호가 중첩된 경우 ["..."] 로 감싸기
  result = result.replace(
    /\[([^\]"]*\([^\]]*\)[^\]"]*)\]/g,
    (_, inner) => {
      const cleaned = inner.replace(/\(/g, " - ").replace(/\)/g, "");
      return `["${cleaned.trim()}"]`;
    }
  );

  return result;
}
