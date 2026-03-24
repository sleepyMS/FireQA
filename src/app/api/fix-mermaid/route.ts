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

  let body: { code?: string; error?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!body.code) {
    return NextResponse.json({ error: "코드가 필요합니다." }, { status: 400 });
  }

  const systemPrompt = `당신은 Mermaid.js 구문 전문가입니다. 파싱 에러가 발생한 Mermaid 코드를 수정합니다.
다이어그램의 의미와 구조를 최대한 유지하면서 구문 오류만 수정하세요.

${MERMAID_RULES}`;

  const userPrompt = `아래 Mermaid 코드에서 파싱 에러가 발생했습니다. 수정해주세요.

${body.error ? `## 에러 메시지:\n${body.error}\n\n` : ""}## 원본 코드:
${body.code}`;

  return createSSEStream(async (writer) => {
    writer.send({ type: "stage", stage: Stage.FIXING, message: "AI가 코드를 수정하고 있습니다..." });

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
        fixedCode: result.mermaidCode,
        nodes: result.nodes,
        edges: result.edges,
      },
      tokenUsage,
    });
    writer.close();
  }, request.signal);
}
