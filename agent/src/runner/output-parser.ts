export type ParsedChunk = {
  type: "text" | "tool_use" | "tool_result" | "error";
  content: string;
  tool?: string;
};

export function parseStreamJsonLine(line: string): ParsedChunk | null {
  try {
    const data = JSON.parse(line);

    if (data.type === "assistant") {
      if (data.subtype === "text" && data.text) {
        return { type: "text", content: data.text };
      }
      if (data.subtype === "tool_use" && data.tool_name) {
        return { type: "tool_use", content: data.tool_name, tool: data.tool_name };
      }
    }

    if (data.type === "tool_result") {
      return { type: "tool_result", content: String(data.content ?? "").slice(0, 500) };
    }

    if (data.type === "result") {
      return { type: "text", content: String(data.result ?? "") };
    }

    return null;
  } catch {
    return null;
  }
}
