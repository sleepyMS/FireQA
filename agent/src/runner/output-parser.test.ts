import { describe, it, expect } from "vitest";
import { parseStreamJsonLine } from "./output-parser.js";

describe("parseStreamJsonLine", () => {
  it("assistant text 메시지를 파싱한다", () => {
    const line = JSON.stringify({
      type: "assistant",
      subtype: "text",
      text: "기획서를 분석하고 있습니다.",
    });
    const result = parseStreamJsonLine(line);
    expect(result).toEqual({
      type: "text",
      content: "기획서를 분석하고 있습니다.",
    });
  });

  it("tool_use 메시지를 파싱한다", () => {
    const line = JSON.stringify({
      type: "assistant",
      subtype: "tool_use",
      tool_name: "mcp__figma__create_node",
    });
    const result = parseStreamJsonLine(line);
    expect(result).toEqual({
      type: "tool_use",
      content: "mcp__figma__create_node",
      tool: "mcp__figma__create_node",
    });
  });

  it("알 수 없는 형식은 null을 반환한다", () => {
    const result = parseStreamJsonLine("not json");
    expect(result).toBeNull();
  });

  it("result 메시지를 파싱한다", () => {
    const line = JSON.stringify({
      type: "result",
      result: "완료되었습니다.",
    });
    const result = parseStreamJsonLine(line);
    expect(result).toEqual({
      type: "text",
      content: "완료되었습니다.",
    });
  });
});
