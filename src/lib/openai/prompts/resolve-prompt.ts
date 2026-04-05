import { JobType } from "@/types/enums";
import { TEST_CASE_SYSTEM_PROMPT } from "./test-case-system";
import { DIAGRAM_SYSTEM_PROMPT } from "./diagram-system";
import { SPEC_IMPROVE_SYSTEM_PROMPT } from "./spec-improve-system";
import { WIREFRAME_SYSTEM_PROMPT } from "./wireframe-system";

interface TemplateForPrompt {
  name: string;
  sheetConfig: string;
  columnConfig: string;
  constraints: string;
  requirements: string;
  systemPromptOverride?: string | null;
  promptMode?: string | null;
}

const BASE_PROMPTS: Record<string, string> = {
  [JobType.TEST_CASES]: TEST_CASE_SYSTEM_PROMPT,
  [JobType.DIAGRAMS]: DIAGRAM_SYSTEM_PROMPT,
  [JobType.SPEC_IMPROVE]: SPEC_IMPROVE_SYSTEM_PROMPT,
  [JobType.WIREFRAMES]: WIREFRAME_SYSTEM_PROMPT,
};

/**
 * 시스템 프롬프트를 결정한다.
 * - template이 없으면 기본 프롬프트 반환
 * - promptMode === "replace" && systemPromptOverride → 오버라이드만 사용
 * - promptMode === "append" && systemPromptOverride → 기본 프롬프트 + 오버라이드 append
 * - constraints/requirements가 있으면 buildTemplateGuideline() 적용
 */
export function resolveSystemPrompt(
  type: JobType,
  template?: TemplateForPrompt | null,
): string {
  const basePrompt = BASE_PROMPTS[type] ?? TEST_CASE_SYSTEM_PROMPT;

  if (!template) {
    return basePrompt;
  }

  const mode = template.promptMode ?? "append";
  const override = template.systemPromptOverride?.trim();

  // replace 모드: 오버라이드가 있으면 기본 프롬프트 대신 사용
  if (mode === "replace" && override) {
    const guideline = buildTemplateGuideline(template);
    return guideline ? override + guideline : override;
  }

  // append 모드 (기본): 기본 프롬프트 + 오버라이드 + 가이드라인
  const guideline = buildTemplateGuideline(template);
  let result = basePrompt;

  if (override) {
    result += `\n\n## 사용자 추가 지침\n${override}`;
  }

  if (guideline) {
    result += guideline;
  }

  return result;
}

/**
 * 템플릿의 시트/컬럼/제약조건/요구사항을 프롬프트 가이드라인으로 변환한다.
 */
export function buildTemplateGuideline(template: {
  name: string;
  sheetConfig: string;
  columnConfig: string;
  constraints: string;
  requirements: string;
}): string {
  const sheets = JSON.parse(template.sheetConfig || "[]") as {
    name: string;
    description: string;
  }[];
  const columns = JSON.parse(template.columnConfig || "[]") as {
    key: string;
    label: string;
    custom?: boolean;
    description?: string;
  }[];

  // 가이드라인 내용이 전혀 없으면 빈 문자열 반환
  if (
    sheets.length === 0 &&
    columns.length === 0 &&
    !template.constraints &&
    !template.requirements
  ) {
    return "";
  }

  let guideline = `\n\n## 사용자 지정 템플릿: "${template.name}"\n`;
  guideline += `아래 템플릿 가이드라인에 **반드시** 따라 TC를 생성하세요.\n\n`;

  if (sheets.length > 0) {
    guideline += `### 시트 구성 (반드시 이 시트들로 분류)\n`;
    sheets.forEach((s, i) => {
      guideline += `${i + 1}. **${s.name}**`;
      if (s.description) guideline += `: ${s.description}`;
      guideline += `\n`;
    });
    guideline += `\n위 시트 이름을 sheetName으로 사용하세요. 기획 문서의 모든 TC를 이 시트들 중 하나에 분류해야 합니다.\n`;
    guideline += `위 시트에 해당하지 않는 TC가 있더라도, 가장 적합한 시트에 포함시키세요.\n\n`;
  }

  const standardCols = columns.filter((c) => !c.custom);
  const customCols = columns.filter((c) => c.custom);

  if (standardCols.length > 0) {
    guideline += `### 기본 컬럼\n`;
    guideline += `다음 기본 컬럼을 의미있게 채우세요: ${standardCols.map((c) => c.label).join(", ")}\n\n`;
  }

  if (customCols.length > 0) {
    guideline += `### 추가 컬럼 (사용자 지정)\n`;
    guideline += `기본 TC 필드 외에, 각 TC의 expectedResult 필드 맨 끝에 다음 추가 정보를 "[컬럼명: 값]" 형식으로 포함시키세요:\n`;
    customCols.forEach((c) => {
      guideline += `- **${c.label}**`;
      if (c.description) guideline += `: ${c.description}`;
      guideline += `\n`;
    });
    guideline += `\n예시: 기대결과 내용... [우선순위: High] [담당자: QA팀]\n`;
  }

  if (template.constraints) {
    guideline += `\n### ⛔ 제약조건 (위반 금지 — 최우선 준수)\n`;
    guideline += `아래 제약조건은 절대적입니다. 어떤 상황에서도 위반해서는 안 됩니다. 모든 TC 생성 시 아래 규칙을 1순위로 적용하세요.\n\n`;
    guideline += template.constraints;
    guideline += `\n`;
  }

  if (template.requirements) {
    guideline += `\n### 💡 요구사항 (권장 — 가능한 한 반영)\n`;
    guideline += `아래 요구사항은 가능한 한 반영해주세요. 제약조건과 충돌하면 제약조건을 우선합니다.\n\n`;
    guideline += template.requirements;
    guideline += `\n`;
  }

  return guideline;
}
