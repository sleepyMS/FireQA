import { NextRequest, NextResponse } from "next/server";
import { callOpenAIWithSchema } from "@/lib/openai/call-with-schema";
import {
  diagramWithNodesSchema,
  MERMAID_RULES,
} from "@/lib/openai/schemas/diagram-with-nodes";
import { errorResponse } from "@/lib/api/error-response";

export async function POST(request: NextRequest) {
  try {
    const { code, instruction } = await request.json();

    if (!code || !instruction) {
      return NextResponse.json(
        { error: "코드와 요구사항이 필요합니다." },
        { status: 400 }
      );
    }

    const systemPrompt = `당신은 Mermaid.js 다이어그램 전문가입니다. 사용자의 요구사항에 따라 기존 Mermaid 다이어그램을 수정/개선합니다.
기존 다이어그램의 구조와 내용을 유지하면서 요구사항만 반영하세요.

${MERMAID_RULES}`;

    const userPrompt = `아래 Mermaid 다이어그램을 요구사항에 맞게 수정해주세요.

## 현재 다이어그램:
${code}

## 요구사항:
${instruction}`;

    const { result } = await callOpenAIWithSchema<{
      mermaidCode: string;
      nodes: unknown[];
      edges: unknown[];
    }>(systemPrompt, userPrompt, diagramWithNodesSchema);

    return NextResponse.json({
      improvedCode: result.mermaidCode,
      nodes: result.nodes,
      edges: result.edges,
    });
  } catch (err) {
    return errorResponse(err, "다이어그램 개선에 실패했습니다.");
  }
}
