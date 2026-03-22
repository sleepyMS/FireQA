import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  diagramWithNodesSchema,
  MERMAID_RULES,
} from "@/lib/openai/schemas/diagram-with-nodes";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

export async function POST(request: NextRequest) {
  try {
    const { code, instruction } = await request.json();

    if (!code || !instruction) {
      return NextResponse.json(
        { error: "코드와 요구사항이 필요합니다." },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `당신은 Mermaid.js 다이어그램 전문가입니다. 사용자의 요구사항에 따라 기존 Mermaid 다이어그램을 수정/개선합니다.
기존 다이어그램의 구조와 내용을 유지하면서 요구사항만 반영하세요.

${MERMAID_RULES}`,
        },
        {
          role: "user",
          content: `아래 Mermaid 다이어그램을 요구사항에 맞게 수정해주세요.

## 현재 다이어그램:
${code}

## 요구사항:
${instruction}`,
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
      improvedCode: result.mermaidCode,
      nodes: result.nodes,
      edges: result.edges,
      tokensUsed: response.usage?.total_tokens || 0,
    });
  } catch (error) {
    console.error("다이어그램 개선 오류:", error);
    return NextResponse.json(
      { error: "다이어그램 개선에 실패했습니다." },
      { status: 500 }
    );
  }
}
