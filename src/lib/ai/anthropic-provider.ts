import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider } from "./provider";
import type { SSEWriter } from "@/lib/sse/create-sse-stream";

const ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929";

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async streamWithSchema<T>(opts: {
    systemPrompt: string;
    userPrompt: string;
    jsonSchema: { name: string; strict: boolean; schema: Record<string, unknown> };
    writer: SSEWriter;
    signal?: AbortSignal;
    progressRange?: { min: number; max: number };
  }): Promise<{ result: T; tokenUsage: number }> {
    const { systemPrompt, userPrompt, jsonSchema, writer, signal, progressRange } = opts;
    const pMin = progressRange?.min ?? 40;
    const pMax = progressRange?.max ?? 90;
    const ESTIMATED_RESPONSE_SIZE = 10_000;

    const toolName = jsonSchema.name;

    const stream = this.client.messages.stream({
      model: ANTHROPIC_MODEL,
      max_tokens: 16384,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      tool_choice: { type: "tool", name: toolName },
      tools: [
        {
          name: toolName,
          description: "Generate structured output matching the required JSON schema",
          input_schema: jsonSchema.schema as Anthropic.Tool.InputSchema,
        },
      ],
    });

    let accumulatedLength = 0;
    let lastEmitTime = 0;
    const THROTTLE_MS = 500;

    stream.on("inputJson", (partialJson: string) => {
      if (signal?.aborted || writer.closed) {
        stream.controller.abort();
        return;
      }

      accumulatedLength += partialJson.length;

      const now = Date.now();
      if (now - lastEmitTime >= THROTTLE_MS) {
        const ratio = Math.min(accumulatedLength / ESTIMATED_RESPONSE_SIZE, 0.95);
        const estimatedProgress = Math.round(pMin + (pMax - pMin) * ratio);
        writer.send({ type: "progress", charsReceived: accumulatedLength, estimatedProgress });
        lastEmitTime = now;
      }
    });

    const finalMessage = await stream.finalMessage();

    if (signal?.aborted || writer.closed) {
      throw new Error("클라이언트 연결이 끊어졌습니다.");
    }

    // Extract tool_use result from content blocks
    const toolBlock = finalMessage.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    if (!toolBlock) {
      throw new Error("Anthropic 응답에서 구조화된 결과를 찾을 수 없습니다.");
    }

    const result = toolBlock.input as T;
    const tokenUsage =
      (finalMessage.usage.input_tokens ?? 0) + (finalMessage.usage.output_tokens ?? 0);

    return { result, tokenUsage };
  }
}
