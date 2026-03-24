import { openai, MODEL } from "@/lib/openai/client";
import type { SSEWriter } from "./create-sse-stream";

interface StreamOpenAIOptions {
  systemPrompt: string;
  userPrompt: string;
  jsonSchema: { name: string; strict: boolean; schema: Record<string, unknown> };
  writer: SSEWriter;
  signal?: AbortSignal;
}

/**
 * OpenAI 스트리밍 호출 → SSE writer로 토큰 진행 이벤트 전송.
 * 완료 시 전체 JSON을 파싱하여 결과 반환.
 */
export async function streamOpenAIWithSchema<T>(
  opts: StreamOpenAIOptions
): Promise<{ result: T; tokenUsage: number }> {
  const { systemPrompt, userPrompt, jsonSchema, writer, signal } = opts;

  const stream = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: jsonSchema,
    },
    stream: true,
    stream_options: { include_usage: true },
  });

  let accumulated = "";
  let tokenUsage = 0;
  let lastEmitTime = 0;
  const THROTTLE_MS = 500;

  for await (const chunk of stream) {
    if (signal?.aborted || writer.closed) {
      stream.controller.abort();
      throw new Error("클라이언트 연결이 끊어졌습니다.");
    }

    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      accumulated += delta;

      const now = Date.now();
      if (now - lastEmitTime >= THROTTLE_MS) {
        writer.send({ type: "progress", charsReceived: accumulated.length });
        lastEmitTime = now;
      }
    }

    if (chunk.usage) {
      tokenUsage = chunk.usage.total_tokens;
    }
  }

  if (!accumulated) {
    throw new Error("OpenAI 응답이 비어있습니다.");
  }

  const result = JSON.parse(accumulated) as T;
  return { result, tokenUsage };
}
