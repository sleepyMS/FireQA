import type { SSEWriter } from "./create-sse-stream";
import { streamOpenAIWithSchema } from "./stream-openai";
import type { TestCaseGenerationResult, TestSheet } from "@/types/test-case";

interface StreamChunkedOptions {
  chunks: string[];
  systemPrompt: string;
  buildUserPrompt: (chunk: string) => string;
  jsonSchema: { name: string; strict: boolean; schema: Record<string, unknown> };
  writer: SSEWriter;
  signal?: AbortSignal;
}

/**
 * 다중 청크 TC 생성 전용 스트리밍 래퍼.
 * 각 청크를 순차 처리하면서 chunk_progress 이벤트를 전송하고,
 * 결과를 병합하여 최종 TestCaseGenerationResult를 반환한다.
 */
export async function streamOpenAIChunked(
  opts: StreamChunkedOptions
): Promise<{ result: TestCaseGenerationResult; totalTokens: number }> {
  const { chunks, systemPrompt, buildUserPrompt, jsonSchema, writer, signal } = opts;

  let totalTokens = 0;
  const allSheets: TestSheet[] = [];
  let tcCounter = 1;

  for (let i = 0; i < chunks.length; i++) {
    if (writer.closed) break;

    writer.send({
      type: "chunk_progress",
      index: i + 1,
      total: chunks.length,
      charsSoFar: totalTokens,
    });

    const { result: partial, tokenUsage } =
      await streamOpenAIWithSchema<TestCaseGenerationResult>({
        systemPrompt,
        userPrompt: buildUserPrompt(chunks[i]),
        jsonSchema,
        writer,
        signal,
      });

    totalTokens += tokenUsage;

    for (const sheet of partial.sheets) {
      const existing = allSheets.find((s) => s.sheetName === sheet.sheetName);
      if (existing) {
        for (const tc of sheet.testCases) {
          tc.tcId = `TC_${String(tcCounter++).padStart(3, "0")}`;
          existing.testCases.push(tc);
        }
      } else {
        for (const tc of sheet.testCases) {
          tc.tcId = `TC_${String(tcCounter++).padStart(3, "0")}`;
        }
        allSheets.push(sheet);
      }
    }
  }

  return {
    result: { sheets: allSheets },
    totalTokens,
  };
}
