import { OpenAIProvider } from "@/lib/ai/openai-provider";
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
 *
 * 내부적으로 OpenAIProvider에 위임한다.
 */
export async function streamOpenAIWithSchema<T>(
  opts: StreamOpenAIOptions
): Promise<{ result: T; tokenUsage: number }> {
  const provider = new OpenAIProvider();
  return provider.streamWithSchema<T>(opts);
}
