export type ParsedChunk = {
  type: "text" | "tool_use" | "tool_result" | "error";
  content: string;
  tool?: string;
  sessionId?: string; // result 이벤트에서만 설정됨 (세션 연속성용)
};

export function parseStreamJsonLine(line: string): ParsedChunk | null {
  try {
    const data = JSON.parse(line);

    // Claude stream-json format: {"type":"assistant","message":{"content":[{"type":"text","text":"..."}]}}
    if (data.type === "assistant" && data.message?.content) {
      const content: Array<{ type: string; text?: string; name?: string; id?: string }> = data.message.content;
      for (const block of content) {
        if (block.type === "text" && block.text) {
          return { type: "text", content: block.text };
        }
        if (block.type === "tool_use" && block.name) {
          return { type: "tool_use", content: block.name, tool: block.name };
        }
      }
    }

    if (data.type === "tool_result") {
      return { type: "tool_result", content: String(data.content ?? "").slice(0, 500) };
    }

    if (data.type === "result") {
      return {
        type: "text",
        content: String(data.result ?? ""),
        sessionId: data.session_id ?? undefined,
      };
    }

    return null;
  } catch {
    return null;
  }
}
