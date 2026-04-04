import { openai, MODEL } from "@/lib/openai/client";
import type { SSEWriter } from "./create-sse-stream";

interface StreamOpenAIOptions {
  systemPrompt: string;
  userPrompt: string;
  jsonSchema: { name: string; strict: boolean; schema: Record<string, unknown> };
  writer: SSEWriter;
  signal?: AbortSignal;
  /** AI 생성 단계 진행률 범위 (기본값 40~90) */
  progressRange?: { min: number; max: number };
}

/**
 * OpenAI 스트리밍 호출 → SSE writer로 토큰 진행 이벤트 전송.
 * 완료 시 전체 JSON을 파싱하여 결과 반환.
 */
export async function streamOpenAIWithSchema<T>(
  opts: StreamOpenAIOptions
): Promise<{ result: T; tokenUsage: number }> {
  const { systemPrompt, userPrompt, jsonSchema, writer, signal, progressRange } = opts;
  const pMin = progressRange?.min ?? 40;
  const pMax = progressRange?.max ?? 90;
  // 일반적인 응답 크기 추정 (10KB) — 진행률 추정에 사용
  const ESTIMATED_RESPONSE_SIZE = 10_000;

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
        // chars 기반 진행률 추정 (asymptotic — 100%에 수렴하지만 도달하지 않음)
        const ratio = Math.min(accumulated.length / ESTIMATED_RESPONSE_SIZE, 0.95);
        const estimatedProgress = Math.round(pMin + (pMax - pMin) * ratio);
        writer.send({ type: "progress", charsReceived: accumulated.length, estimatedProgress });
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
