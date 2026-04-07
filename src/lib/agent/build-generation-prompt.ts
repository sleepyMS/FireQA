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
 * CLI 에이전트가 로컬 파일을 탐색하지 않도록 역할과 제약을 명시한다.
 */
const AGENT_HARNESS = `## 중요 지시
너는 문서 분석 및 생성 전문가이다. 코딩 에이전트가 아니다.
- 로컬 파일 시스템을 탐색하지 마라 (Glob, Read, Bash, Grep 등 사용 금지)
- 주어진 기획 문서 텍스트만을 입력으로 사용하라
- 요청된 JSON 형식으로만 응답하라`;

/**
 * Figma MCP로 직접 그려야 하는 경우의 하네스.
 * JSON 출력 대신 Figma MCP 도구 호출이 최우선 목표.
 */
const AGENT_HARNESS_FIGMA = `## 중요 지시
너는 Figma에 직접 디자인을 생성하는 전문가이다.
- 로컬 파일 시스템을 탐색하지 마라 (Glob, Read, Bash, Grep 등 사용 금지)
- 주어진 기획 문서 텍스트만을 입력으로 사용하라
- 반드시 Figma MCP 도구를 사용하여 Figma 파일에 직접 요소를 생성하라
- JSON 텍스트 출력이 아니라 Figma MCP 도구 호출로 실제 화면을 그려야 한다

## MCP 도구 사용법
Figma MCP 도구는 ToolSearch를 통해 발견할 수 있다.
먼저 ToolSearch로 "Figma" 를 검색하여 사용 가능한 Figma MCP 도구 목록을 확인하라.
주요 도구: mcp__claude_ai_Figma__use_figma, mcp__claude_ai_Figma__generate_diagram, mcp__claude_ai_Figma__get_figjam
- 와이어프레임/UI 생성: use_figma 도구 사용
- 다이어그램/플로우차트: generate_diagram 도구 사용

## 작업 순서 (반드시 따를 것)
1. ToolSearch로 "Figma" 검색하여 도구 스키마 로드
2. 기획 문서 분석
3. Figma MCP 도구를 호출하여 Figma 파일에 직접 요소 생성
4. 완료 후 생성한 화면 목록을 텍스트로 요약 출력`;

/**
 * 에이전트용 프롬프트 생성.
 * systemPrompt: resolveSystemPrompt()로 결정된 시스템 프롬프트
 */
export function buildGenerationPrompt(
  taskType: string,
  systemPrompt: string,
  parsedText: string,
  figmaFileKey?: string,
): string {
  // Figma MCP로 직접 그리는 경우: JSON 출력 형식 대신 Figma 도구 호출 지시
  if (figmaFileKey) {
    const figmaInstruction = `## Figma 작업 지시
대상 Figma 파일 키: ${figmaFileKey}

1. ToolSearch로 "Figma"를 검색하여 Figma MCP 도구 스키마를 로드하라
2. 아래 기획 문서를 분석하라
3. Figma MCP 도구(use_figma, generate_diagram 등)를 호출하여 위 파일에 직접 와이어프레임/다이어그램을 생성하라
4. 각 화면을 별도 Frame으로 만들고, UI 요소(텍스트, 버튼, 입력 필드 등)를 배치하라
5. 완료 후 생성한 화면 목록을 텍스트로 요약하라

중요: 절대 JSON 텍스트만 출력하지 마라. 반드시 Figma MCP 도구를 호출하여 실제 Figma 파일에 그려야 한다.`;

    switch (taskType) {
      case "diagram-generate":
        return [AGENT_HARNESS_FIGMA, systemPrompt, buildDiagramUserPrompt(parsedText), figmaInstruction].join("\n\n---\n\n");
      case "wireframe-generate":
        return [
          AGENT_HARNESS_FIGMA,
          systemPrompt,
          `아래 기획 문서를 분석하여 화면 와이어프레임을 설계하세요.\n\n## 기획 문서:\n${parsedText}`,
          figmaInstruction,
        ].join("\n\n---\n\n");
      default:
        break;
    }
  }

  // Figma 미사용: JSON 출력 모드
  switch (taskType) {
    case "tc-generate":
      return [AGENT_HARNESS, systemPrompt, buildTestCaseUserPrompt(parsedText), TC_OUTPUT_FORMAT].join("\n\n---\n\n");

    case "diagram-generate":
      return [AGENT_HARNESS, systemPrompt, buildDiagramUserPrompt(parsedText), DIAGRAM_OUTPUT_FORMAT].join("\n\n---\n\n");

    case "wireframe-generate":
      return [
        AGENT_HARNESS,
        systemPrompt,
        `아래 기획 문서를 분석하여 화면 와이어프레임을 설계하세요.\n\n## 기획 문서:\n${parsedText}`,
        WIREFRAME_OUTPUT_FORMAT,
      ].join("\n\n---\n\n");

    case "improve-spec":
      return [
        AGENT_HARNESS,
        systemPrompt,
        `아래 기획 문서를 분석하여 개선된 버전을 작성하세요.\n\n## 원본 기획서:\n${parsedText}`,
        SPEC_OUTPUT_FORMAT,
      ].join("\n\n---\n\n");

    default:
      return `${systemPrompt}\n\n${parsedText}`;
  }
}
