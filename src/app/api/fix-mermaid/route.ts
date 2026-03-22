import { NextRequest, NextResponse } from "next/server";
import { openai, MODEL } from "@/lib/openai/client";
import {
  diagramWithNodesSchema,
  MERMAID_RULES,
} from "@/lib/openai/schemas/diagram-with-nodes";

export async function POST(request: NextRequest) {
  try {
    const { code, error } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: "코드가 필요합니다." },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `당신은 Mermaid.js 구문 전문가입니다. 파싱 에러가 발생한 Mermaid 코드를 수정합니다.
다이어그램의 의미와 구조를 최대한 유지하면서 구문 오류만 수정하세요.

${MERMAID_RULES}`,
        },
        {
          role: "user",
          content: `아래 Mermaid 코드에서 파싱 에러가 발생했습니다. 수정해주세요.

${error ? `## 에러 메시지:\n${error}\n\n` : ""}## 원본 코드:
${code}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: diagramWithNodesSchema,
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "AI 응답이 비어있습니다." },
        { status: 500 }
      );
    }

    const result = JSON.parse(content);

    return NextResponse.json({
      fixedCode: result.mermaidCode,
      nodes: result.nodes,
      edges: result.edges,
      tokensUsed: response.usage?.total_tokens || 0,
    });
  } catch (error) {
    console.error("Mermaid 수정 오류:", error);
    return NextResponse.json(
      { error: "코드 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}
