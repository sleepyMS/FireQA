import { describe, it, expect } from "vitest";
import { generateOrgSlug } from "./provision-user";

describe("generateOrgSlug", () => {
  it("이메일 로컬 파트를 slug로 변환한다", () => {
    const slug = generateOrgSlug("user@example.com");
    expect(slug).toMatch(/^user-\d+$/);
  });

  it("특수문자를 하이픈으로 치환한다", () => {
    const slug = generateOrgSlug("john.doe+test@example.com");
    expect(slug).toMatch(/^john-doe-test-\d+$/);
  });

  it("30자를 초과하는 로컬 파트는 잘린다", () => {
    const slug = generateOrgSlug("averylongemailaddressthatexceedslimit@example.com");
    // slug = base(≤30) + '-' + timestamp
    const base = slug.split("-").slice(0, -1).join("-");
    expect(base.length).toBeLessThanOrEqual(30);
  });

  it("빈 로컬 파트는 team으로 대체된다", () => {
    const slug = generateOrgSlug("@example.com");
    expect(slug).toMatch(/^team-\d+$/);
  });
});
