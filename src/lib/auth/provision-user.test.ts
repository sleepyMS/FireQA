import { describe, it, expect } from "vitest";
import { generateOrgSlug } from "./provision-user";

describe("generateOrgSlug", () => {
  it("팀 이름을 소문자 slug로 변환한다", () => {
    const slug = generateOrgSlug("My Team");
    expect(slug).toBe("my-team");
  });

  it("특수문자를 하이픈으로 치환한다", () => {
    const slug = generateOrgSlug("john.doe's Team!");
    expect(slug).toBe("john-doe-s-team");
  });

  it("48자를 초과하는 이름은 잘린다", () => {
    const longName = "a".repeat(60);
    const slug = generateOrgSlug(longName);
    expect(slug.length).toBeLessThanOrEqual(48);
  });

  it("하이픈만 남는 이름은 team으로 대체된다", () => {
    const slug = generateOrgSlug("---");
    expect(slug).toBe("team");
  });
});
