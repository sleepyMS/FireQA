import { describe, it, expect } from "vitest";
import { hasRole, requireRole } from "./require-role";
import { UserRole } from "@/types/enums";

describe("hasRole", () => {
  it("owner는 모든 역할 요건을 충족한다", () => {
    expect(hasRole(UserRole.OWNER, UserRole.OWNER)).toBe(true);
    expect(hasRole(UserRole.OWNER, UserRole.ADMIN)).toBe(true);
    expect(hasRole(UserRole.OWNER, UserRole.MEMBER)).toBe(true);
  });

  it("admin은 admin/member 요건을 충족하지만 owner는 충족하지 못한다", () => {
    expect(hasRole(UserRole.ADMIN, UserRole.OWNER)).toBe(false);
    expect(hasRole(UserRole.ADMIN, UserRole.ADMIN)).toBe(true);
    expect(hasRole(UserRole.ADMIN, UserRole.MEMBER)).toBe(true);
  });

  it("member는 member 요건만 충족한다", () => {
    expect(hasRole(UserRole.MEMBER, UserRole.OWNER)).toBe(false);
    expect(hasRole(UserRole.MEMBER, UserRole.ADMIN)).toBe(false);
    expect(hasRole(UserRole.MEMBER, UserRole.MEMBER)).toBe(true);
  });

  it("알 수 없는 역할은 항상 거부된다", () => {
    expect(hasRole("unknown", UserRole.MEMBER)).toBe(false);
  });
});

describe("requireRole", () => {
  it("요건을 충족하면 null을 반환한다", () => {
    expect(requireRole(UserRole.ADMIN, UserRole.MEMBER)).toBeNull();
    expect(requireRole(UserRole.OWNER, UserRole.ADMIN)).toBeNull();
  });

  it("요건 미달 시 403 에러 객체를 반환한다", () => {
    const result = requireRole(UserRole.MEMBER, UserRole.ADMIN);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });
});
