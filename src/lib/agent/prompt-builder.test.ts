import { describe, it, expect } from "vitest";
import { buildAgentPrompt } from "./prompt-builder";
import { AgentTaskType } from "@/types/agent";

describe("buildAgentPrompt", () => {
  it("TC_GENERATE 유형에 시스템 역할이 포함된다", () => {
    const prompt = buildAgentPrompt({
      type: AgentTaskType.TC_GENERATE,
      prompt: "로그인 기능 TC 생성",
      context: {},
    });
    expect(prompt).toContain("QA 엔지니어");
    expect(prompt).toContain("로그인 기능 TC 생성");
  });

  it("프로젝트 컨텍스트가 포함된다", () => {
    const prompt = buildAgentPrompt({
      type: AgentTaskType.TC_GENERATE,
      prompt: "TC 생성",
      context: {},
      project: { name: "파이브스팟", description: "공간 제휴 서비스" },
    });
    expect(prompt).toContain("파이브스팟");
    expect(prompt).toContain("공간 제휴 서비스");
  });

  it("템플릿 내용이 포함된다", () => {
    const prompt = buildAgentPrompt({
      type: AgentTaskType.TC_GENERATE,
      prompt: "TC 생성",
      context: { templateContent: "시나리오 | 단계 | 기대결과" },
    });
    expect(prompt).toContain("시나리오 | 단계 | 기대결과");
  });

  it("Figma 파일 키가 있으면 Figma MCP 지시가 포함된다", () => {
    const prompt = buildAgentPrompt({
      type: AgentTaskType.DIAGRAM_GENERATE,
      prompt: "플로우 다이어그램 생성",
      context: { figmaFileKey: "abc123" },
    });
    expect(prompt).toContain("abc123");
    expect(prompt).toContain("Figma MCP");
  });

  it("CUSTOM 유형에는 최소한의 시스템 프롬프트만 포함된다", () => {
    const prompt = buildAgentPrompt({
      type: AgentTaskType.CUSTOM,
      prompt: "자유 지시",
      context: {},
    });
    expect(prompt).toContain("자유 지시");
    expect(prompt).not.toContain("QA 엔지니어");
  });

  it("첨부 파일 URL이 포함된다", () => {
    const prompt = buildAgentPrompt({
      type: AgentTaskType.TC_GENERATE,
      prompt: "TC 생성",
      context: { uploadUrls: ["https://example.com/spec.pdf"] },
    });
    expect(prompt).toContain("https://example.com/spec.pdf");
  });
});
