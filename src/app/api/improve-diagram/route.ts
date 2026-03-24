import { NextRequest, NextResponse } from "next/server";
import {
  diagramWithNodesSchema,
  MERMAID_RULES,
} from "@/lib/openai/schemas/diagram-with-nodes";
import { Stage } from "@/types/sse";
import { createSSEStream } from "@/lib/sse/create-sse-stream";
import { streamOpenAIWithSchema } from "@/lib/sse/stream-openai";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  let body: { code?: string; instruction?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!body.code || !body.instruction) {
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
${body.code}

## 요구사항:
${body.instruction}`;

  return createSSEStream(async (writer) => {
    writer.send({ type: "stage", stage: Stage.IMPROVING, message: "AI가 다이어그램을 개선하고 있습니다..." });

    const { result, tokenUsage } = await streamOpenAIWithSchema<{
      mermaidCode: string;
      nodes: unknown[];
      edges: unknown[];
    }>({
      systemPrompt,
      userPrompt,
      jsonSchema: diagramWithNodesSchema,
      writer,
      signal: request.signal,
    });

    writer.send({
      type: "complete",
      data: {
        improvedCode: result.mermaidCode,
        nodes: result.nodes,
        edges: result.edges,
      },
      tokenUsage,
    });
    writer.close();
  }, request.signal);
}
