import type { SSEWriter } from "@/lib/sse/create-sse-stream";

export interface AIProvider {
  streamWithSchema<T>(opts: {
    systemPrompt: string;
    userPrompt: string;
    jsonSchema: { name: string; strict: boolean; schema: Record<string, unknown> };
    writer: SSEWriter;
    signal?: AbortSignal;
    progressRange?: { min: number; max: number };
  }): Promise<{ result: T; tokenUsage: number }>;
}
