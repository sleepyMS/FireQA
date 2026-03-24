import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createGenerationJob, completeJob, failJob } from "@/lib/api/create-generation-job";
import { JobType } from "@/types/enums";
import { Stage } from "@/types/sse";
import { createSSEStream } from "@/lib/sse/create-sse-stream";
import { streamOpenAIWithSchema } from "@/lib/sse/stream-openai";
import { streamOpenAIChunked } from "@/lib/sse/stream-openai-chunked-tc";
import {
  TEST_CASE_SYSTEM_PROMPT,
  buildTestCaseUserPrompt,
} from "@/lib/openai/prompts/test-case-system";
import { testCaseJsonSchema } from "@/lib/openai/schemas/test-case";
import { splitDocument } from "@/lib/text/split-document";
import type { TestCaseGenerationResult } from "@/types/test-case";

// Vercel 서버리스 타임아웃 확장 (5분)
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const projectName = formData.get("projectName") as string;
  const templateId = formData.get("templateId") as string | null;

  if (!file || !projectName) {
    return NextResponse.json(
      { error: "파일과 프로젝트 이름이 필요합니다." },
      { status: 400 }
    );
  }

  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  return createSSEStream(async (writer) => {
    writer.send({ type: "stage", stage: Stage.PARSING, message: "문서를 파싱하고 있습니다...", progress: 10 });

    let templateGuideline: string | undefined;
    if (templateId) {
      const template = await prisma.qATemplate.findUnique({
        where: { id: templateId },
      });
      if (template) {
        templateGuideline = buildTemplateGuideline(template);
      }
    }

    const { jobId, parsedText } = await createGenerationJob(file, projectName, JobType.TEST_CASES, {
      userId: user.userId,
      organizationId: user.organizationId,
    });
    writer.send({ type: "job_created", jobId });

    try {
      const systemPrompt = templateGuideline
        ? TEST_CASE_SYSTEM_PROMPT + templateGuideline
        : TEST_CASE_SYSTEM_PROMPT;

      const chunks = splitDocument(parsedText);

      writer.send({
        type: "stage",
        stage: Stage.GENERATING,
        message: chunks.length > 1
          ? `AI가 TC를 생성하고 있습니다... (${chunks.length}개 청크)`
          : "AI가 TC를 생성하고 있습니다...",
        progress: 20,
      });

      let result: TestCaseGenerationResult;
      let tokenUsage: number;

      if (chunks.length === 1) {
        const res = await streamOpenAIWithSchema<TestCaseGenerationResult>({
          systemPrompt,
          userPrompt: buildTestCaseUserPrompt(parsedText),
          jsonSchema: testCaseJsonSchema,
          writer,
          signal: request.signal,
        });
        result = res.result;
        tokenUsage = res.tokenUsage;
      } else {
        const res = await streamOpenAIChunked({
          chunks,
          systemPrompt,
          buildUserPrompt: buildTestCaseUserPrompt,
          jsonSchema: testCaseJsonSchema,
          writer,
          signal: request.signal,
        });
        result = res.result;
        tokenUsage = res.totalTokens;
      }

      writer.send({ type: "stage", stage: Stage.SAVING, message: "결과를 저장하고 있습니다...", progress: 95 });
      await completeJob(jobId, result, tokenUsage);

      writer.send({ type: "complete", data: result, tokenUsage });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "TC 생성에 실패했습니다.";
      try { await failJob(jobId, err); } catch { /* DB 에러 무시 */ }
      writer.send({ type: "error", message: errMsg });
    }

    writer.close();
  }, request.signal);
}

function buildTemplateGuideline(template: {
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
