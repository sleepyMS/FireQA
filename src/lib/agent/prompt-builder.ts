import type { AgentTaskContext } from "@/types/agent";

const SYSTEM_ROLES: Record<string, string> = {
  "tc-generate": `너는 숙련된 QA 엔지니어다. 기획서를 분석하여 빠짐없이 테스트 케이스를 작성한다.
- 긍정/부정/경계값/예외 시나리오를 모두 포함한다
- 각 TC에 전제조건, 테스트 단계, 기대결과를 명확히 기술한다
- 결과를 JSON 형식으로 반환한다`,

  "diagram-generate": `너는 다이어그램 설계자다. 기획서를 분석하여 사용자 플로우 다이어그램을 생성한다.
- 주요 화면과 사용자 행동 흐름을 노드와 엣지로 표현한다
- 분기 조건, 에러 플로우를 포함한다`,

  "wireframe-generate": `너는 UI 설계자다. 기획서를 분석하여 화면 와이어프레임을 생성한다.
- 화면별 주요 UI 요소의 배치와 계층 구조를 표현한다
- 인터랙션 포인트를 명시한다`,

  "improve-spec": `너는 QA 리뷰어다. 기존 테스트 케이스를 분석하여 개선한다.
- 누락된 시나리오를 추가한다
- 기존 TC의 모호한 부분을 구체화한다`,

  "custom": "",
};

type PromptInput = {
  type: string;
  prompt: string;
  context: AgentTaskContext;
  project?: { name: string; description?: string | null };
};

export function buildAgentPrompt(input: PromptInput): string {
  const layers: string[] = [];

  // Layer 1: 시스템 역할
  const systemRole = SYSTEM_ROLES[input.type];
  if (systemRole) {
    layers.push(systemRole);
  }

  // Layer 2: 프로젝트 컨텍스트
  if (input.project) {
    const projectInfo = [`프로젝트: ${input.project.name}`];
    if (input.project.description) {
      projectInfo.push(`설명: ${input.project.description}`);
    }
    layers.push(projectInfo.join("\n"));
  }

  // Layer 3: 템플릿
  if (input.context.templateContent) {
    layers.push(`다음 템플릿 형식을 따라라:\n${input.context.templateContent}`);
  }

  // Layer 4: 첨부 파일
  if (input.context.uploadUrls && input.context.uploadUrls.length > 0) {
    layers.push(`분석할 기획서:\n${input.context.uploadUrls.join("\n")}`);
  }

  // Layer 5: Figma 지시
  if (input.context.figmaFileKey) {
    layers.push(
      `Figma 파일 키: ${input.context.figmaFileKey}\n` +
        `다이어그램이나 와이어프레임을 생성한 후 Figma MCP를 사용하여 이 파일에 추가하라.`,
    );
  }

  // Layer 6: 사용자 지시
  layers.push(input.prompt);

  return layers.join("\n\n---\n\n");
}
