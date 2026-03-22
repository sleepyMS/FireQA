import { openai, MODEL } from "./client";
import {
  TEST_CASE_SYSTEM_PROMPT,
  buildTestCaseUserPrompt,
} from "./prompts/test-case-system";
import {
  DIAGRAM_SYSTEM_PROMPT,
  buildDiagramUserPrompt,
} from "./prompts/diagram-system";
import { testCaseJsonSchema } from "./schemas/test-case";
import { diagramJsonSchema } from "./schemas/diagram";
import type { TestCaseGenerationResult, TestSheet } from "@/types/test-case";
import type { DiagramGenerationResult } from "@/types/diagram";
import { sanitizeMermaid } from "@/lib/mermaid/sanitize";

function estimateTokens(text: string): number {
  return Math.ceil(text.length * 1.5);
}

// 문서를 섹션별로 분할
function splitDocument(text: string, maxTokens: number = 80000): string[] {
  const estimated = estimateTokens(text);
  if (estimated <= maxTokens) return [text];

  // 시트 구분자나 큰 헤더로 분할 시도
  const sections = text.split(/(?=^===\s)/m);
  if (sections.length > 1) return sections.filter((s) => s.trim().length > 0);

  // 줄 단위 분할
  const lines = text.split("\n");
  const chunks: string[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  for (const line of lines) {
    const lineTokens = estimateTokens(line);
    if (currentTokens + lineTokens > maxTokens && current.length > 0) {
      chunks.push(current.join("\n"));
      current = [];
      currentTokens = 0;
    }
    current.push(line);
    currentTokens += lineTokens;
  }

  if (current.length > 0) chunks.push(current.join("\n"));
  return chunks;
}

export async function generateTestCases(
  documentText: string,
  templateGuideline?: string
): Promise<{ result: TestCaseGenerationResult; tokenUsage: number }> {
  const systemPrompt = templateGuideline
    ? TEST_CASE_SYSTEM_PROMPT + templateGuideline
    : TEST_CASE_SYSTEM_PROMPT;

  const chunks = splitDocument(documentText);

  if (chunks.length === 1) {
    // 단일 호출
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: buildTestCaseUserPrompt(documentText) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: testCaseJsonSchema,
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("OpenAI 응답이 비어있습니다.");

    return {
      result: JSON.parse(content) as TestCaseGenerationResult,
      tokenUsage: response.usage?.total_tokens ?? 0,
    };
  }

  // 다중 청크: 각각 생성 후 병합
  let totalTokens = 0;
  const allSheets: TestSheet[] = [];
  let tcCounter = 1;

  for (const chunk of chunks) {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: buildTestCaseUserPrompt(chunk) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: testCaseJsonSchema,
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) continue;

    totalTokens += response.usage?.total_tokens ?? 0;
    const partial = JSON.parse(content) as TestCaseGenerationResult;

    for (const sheet of partial.sheets) {
      // 기존 시트에 병합하거나 새 시트 추가
      const existing = allSheets.find((s) => s.sheetName === sheet.sheetName);
      if (existing) {
        for (const tc of sheet.testCases) {
          tc.tcId = `TC_${String(tcCounter++).padStart(3, "0")}`;
          existing.testCases.push(tc);
        }
      } else {
        for (const tc of sheet.testCases) {
          tc.tcId = `TC_${String(tcCounter++).padStart(3, "0")}`;
        }
        allSheets.push(sheet);
      }
    }
  }

  return {
    result: { sheets: allSheets },
    tokenUsage: totalTokens,
  };
}

export async function generateDiagrams(
  documentText: string
): Promise<{ result: DiagramGenerationResult; tokenUsage: number }> {
  // 다이어그램은 전체 문서 맥락이 필요하므로, 너무 긴 경우 요약 후 생성
  let input = documentText;
  if (estimateTokens(documentText) > 100000) {
    input = documentText.slice(0, 60000);
  }

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: DIAGRAM_SYSTEM_PROMPT },
      { role: "user", content: buildDiagramUserPrompt(input) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: diagramJsonSchema,
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI 응답이 비어있습니다.");

  const raw = JSON.parse(content) as DiagramGenerationResult;

  // 서버에서는 정규식 후처리만 수행 (Mermaid는 브라우저 전용이라 서버에서 실행 불가)
  // 구문 검증 및 LLM 수정은 클라이언트의 "AI로 수정" 버튼에서 처리
  const result: DiagramGenerationResult = {
    diagrams: raw.diagrams.map((d) => ({
      ...d,
      mermaidCode: sanitizeMermaid(d.mermaidCode),
    })),
  };

  return {
    result,
    tokenUsage: response.usage?.total_tokens ?? 0,
  };
}


