import { describe, it, expect } from "vitest";
import { sanitizeFilename } from "./sanitize-filename";

describe("sanitizeFilename", () => {
  it("일반 이름은 그대로 반환한다", () => {
    expect(sanitizeFilename("my-project")).toBe("my-project");
  });

  it("한글 등 비ASCII 문자는 제거된다", () => {
    const result = sanitizeFilename("프로젝트-test");
    expect(result).not.toContain("프");
    expect(result).toContain("test");
  });

  it("50자를 초과하면 잘린다", () => {
    const long = "a".repeat(60);
    expect(sanitizeFilename(long).length).toBeLessThanOrEqual(50);
  });

  it("공백은 하이픈으로 치환된다", () => {
    expect(sanitizeFilename("my project name")).toBe("my-project-name");
  });

  it("빈 결과는 project로 대체된다", () => {
    expect(sanitizeFilename("!!!")).toBe("project");
  });

  it("앞뒤 공백이 제거된다", () => {
    expect(sanitizeFilename("  hello  ")).toBe("hello");
  });
});
