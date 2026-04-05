import { buildTestCaseUserPrompt } from "@/lib/openai/prompts/test-case-system";
import { buildDiagramUserPrompt } from "@/lib/openai/prompts/diagram-system";

const TC_OUTPUT_FORMAT = `## 출력 형식
반드시 다음 JSON 형식으로만 응답하세요:
\`\`\`json
{
  "sheets": [
    {
      "name": "시트명",
      "testCases": [
        {
          "tcId": "TC_001",
          "name": "테스트케이스명",
          "depth1": "대분류",
          "depth2": "중분류",
          "depth3": "소분류",
          "precondition": "사전조건",
          "procedure": "테스트 절차",
          "expectedResult": "기대결과"
        }
      ]
    }
  ]
}
\`\`\``;

const DIAGRAM_OUTPUT_FORMAT = `## 출력 형식
반드시 다음 JSON 형식으로만 응답하세요:
\`\`\`json
{
  "diagrams": [
    {
      "title": "다이어그램 제목",
      "description": "설명",
      "mermaidCode": "flowchart TD\\n..."
    }
  ]
}
\`\`\``;

const WIREFRAME_OUTPUT_FORMAT = `## 출력 형식
반드시 다음 JSON 형식으로만 응답하세요:
\`\`\`json
{
  "screens": [
    {
      "id": "screen_1",
      "name": "화면명",
      "description": "화면 설명",
      "elements": [
        { "type": "header", "content": "헤더 내용" }
      ]
    }
  ],
  "flows": [
    {
      "from": "screen_1",
      "to": "screen_2",
      "trigger": "버튼 클릭",
      "condition": ""
    }
  ]
}
\`\`\``;

const SPEC_OUTPUT_FORMAT = `## 출력 형식
반드시 다음 JSON 형식으로만 응답하세요:
\`\`\`json
{
  "markdown": "개선된 기획서 전체 내용 (마크다운 형식)",
  "summary": "주요 개선 사항 요약 (2-3줄)"
}
\`\`\``;

/**
 * 에이전트용 프롬프트 생성.
 * systemPrompt: resolveSystemPrompt()로 결정된 시스템 프롬프트
 */
export function buildGenerationPrompt(
  taskType: string,
  systemPrompt: string,
  parsedText: string,
): string {
  switch (taskType) {
    case "tc-generate":
      return [systemPrompt, buildTestCaseUserPrompt(parsedText), TC_OUTPUT_FORMAT].join("\n\n---\n\n");

    case "diagram-generate":
      return [systemPrompt, buildDiagramUserPrompt(parsedText), DIAGRAM_OUTPUT_FORMAT].join("\n\n---\n\n");

    case "wireframe-generate":
      return [
        systemPrompt,
        `아래 기획 문서를 분석하여 화면 와이어프레임을 설계하세요.\n\n## 기획 문서:\n${parsedText}`,
        WIREFRAME_OUTPUT_FORMAT,
      ].join("\n\n---\n\n");

    case "improve-spec":
      return [
        systemPrompt,
        `아래 기획 문서를 분석하여 개선된 버전을 작성하세요.\n\n## 원본 기획서:\n${parsedText}`,
        SPEC_OUTPUT_FORMAT,
      ].join("\n\n---\n\n");

    default:
      return `${systemPrompt}\n\n${parsedText}`;
  }
}
