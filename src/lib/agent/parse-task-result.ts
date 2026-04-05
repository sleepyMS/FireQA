import type { TestSheet } from "@/types/test-case";

export type ParsedTaskResult =
  | { type: "tc"; sheets: TestSheet[] }
  | { type: "mermaid"; code: string }
  | { type: "diagrams"; diagrams: Array<{ title: string; description: string; mermaidCode: string }> }
  | { type: "wireframe"; screens: unknown[]; flows: unknown[] }
  | { type: "spec"; markdown: string; summary?: string }
  | { type: "figma-link"; urls: string[] }
  | { type: "raw"; content: string };

export function parseTaskResult(taskType: string, rawResult: string): ParsedTaskResult {
  let parsed: { output?: string };
  try {
    parsed = JSON.parse(rawResult);
  } catch {
    return { type: "raw", content: rawResult };
  }

  const output = parsed.output ?? rawResult;

  switch (taskType) {
    case "tc-generate": {
      const sheetsJson = extractJsonWithKey(output, "sheets");
      if (sheetsJson) {
        try {
          const data = JSON.parse(sheetsJson) as { sheets: TestSheet[] };
          if (Array.isArray(data.sheets) && data.sheets.length > 0) {
            return { type: "tc", sheets: data.sheets };
          }
        } catch { /* fall through */ }
      }
      return { type: "raw", content: output };
    }

    case "diagram-generate": {
      // Try structured JSON first
      const diagramsJson = extractJsonWithKey(output, "diagrams");
      if (diagramsJson) {
        try {
          const data = JSON.parse(diagramsJson) as { diagrams: Array<{ title: string; description: string; mermaidCode: string }> };
          if (Array.isArray(data.diagrams) && data.diagrams.length > 0) {
            return { type: "diagrams", diagrams: data.diagrams };
          }
        } catch { /* fall through */ }
      }
      // Fall back to mermaid code block
      const mermaidMatch = output.match(/```mermaid\n([\s\S]*?)```/);
      if (mermaidMatch) {
        return { type: "mermaid", code: mermaidMatch[1].trim() };
      }
      return { type: "raw", content: output };
    }

    case "wireframe-generate": {
      // Try structured JSON first
      const screensJson = extractJsonWithKey(output, "screens");
      if (screensJson) {
        try {
          const data = JSON.parse(screensJson) as { screens: unknown[]; flows?: unknown[] };
          if (Array.isArray(data.screens) && data.screens.length > 0) {
            return { type: "wireframe", screens: data.screens, flows: data.flows ?? [] };
          }
        } catch { /* fall through */ }
      }
      // Fall back to Figma URLs
      const figmaUrls = output.match(/https:\/\/www\.figma\.com\/[^\s)]+/g);
      if (figmaUrls && figmaUrls.length > 0) {
        return { type: "figma-link", urls: figmaUrls };
      }
      return { type: "raw", content: output };
    }

    case "improve-spec": {
      const markdownJson = extractJsonWithKey(output, "markdown");
      if (markdownJson) {
        try {
          const data = JSON.parse(markdownJson) as { markdown: string; summary?: string };
          if (typeof data.markdown === "string" && data.markdown.length > 0) {
            return { type: "spec", markdown: data.markdown, summary: data.summary };
          }
        } catch { /* fall through */ }
      }
      return { type: "raw", content: output };
    }

    default:
      return { type: "raw", content: output };
  }
}

/** 특정 키를 포함하는 JSON 객체를 brace-counting으로 추출 (regex 백트래킹 방지) */
function extractJsonWithKey(text: string, key: string): string | null {
  const marker = `"${key}"`;
  const idx = text.indexOf(marker);
  if (idx === -1) return null;

  // marker 앞의 가장 가까운 '{' 찾기
  let start = -1;
  for (let i = idx - 1; i >= 0; i--) {
    if (text[i] === "{") { start = i; break; }
  }
  if (start === -1) return null;

  // brace-counting으로 매칭되는 '}' 찾기
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}
