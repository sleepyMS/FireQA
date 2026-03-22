import { NextRequest, NextResponse } from "next/server";
import { callOpenAIWithSchema } from "@/lib/openai/call-with-schema";
import {
  diagramWithNodesSchema,
  MERMAID_RULES,
} from "@/lib/openai/schemas/diagram-with-nodes";
import { errorResponse } from "@/lib/api/error-response";

export async function POST(request: NextRequest) {
  try {
    const { code, error } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: "코드가 필요합니다." },
        { status: 400 }
      );
    }

    const systemPrompt = `당신은 Mermaid.js 구문 전문가입니다. 파싱 에러가 발생한 Mermaid 코드를 수정합니다.
다이어그램의 의미와 구조를 최대한 유지하면서 구문 오류만 수정하세요.

${MERMAID_RULES}`;

    const userPrompt = `아래 Mermaid 코드에서 파싱 에러가 발생했습니다. 수정해주세요.

${error ? `## 에러 메시지:\n${error}\n\n` : ""}## 원본 코드:
${code}`;

    const { result } = await callOpenAIWithSchema<{
      mermaidCode: string;
      nodes: unknown[];
      edges: unknown[];
    }>(systemPrompt, userPrompt, diagramWithNodesSchema);

    return NextResponse.json({
      fixedCode: result.mermaidCode,
      nodes: result.nodes,
      edges: result.edges,
    });
  } catch (err) {
    return errorResponse(err, "코드 수정에 실패했습니다.");
  }
}
