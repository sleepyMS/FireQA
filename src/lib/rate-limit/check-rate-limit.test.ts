import { describe, it, expect, vi, beforeEach } from "vitest";

// prisma 모킹 — DB 없이 로직만 테스트
vi.mock("@/lib/db", () => ({
  prisma: {
    generationJob: {
      count: vi.fn(),
    },
  },
}));

import { checkRateLimit } from "./check-rate-limit";
import { prisma } from "@/lib/db";

const mockCount = prisma.generationJob.count as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checkRateLimit", () => {
  it("한도 미만이면 limited=false를 반환한다", async () => {
    mockCount.mockResolvedValue(5);
    const result = await checkRateLimit("org-1");
    expect(result.limited).toBe(false);
    expect(result.remaining).toBe(15);
  });

  it("정확히 한도에 도달하면 limited=true를 반환한다", async () => {
    mockCount.mockResolvedValue(20);
    const result = await checkRateLimit("org-1");
    expect(result.limited).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("한도 초과 시에도 remaining은 0 미만이 되지 않는다", async () => {
    mockCount.mockResolvedValue(25);
    const result = await checkRateLimit("org-1");
    expect(result.remaining).toBe(0);
  });

  it("resetAt은 현재로부터 1시간 후다", async () => {
    mockCount.mockResolvedValue(0);
    const before = Date.now();
    const { resetAt } = await checkRateLimit("org-1");
    const after = Date.now();
    const oneHour = 60 * 60 * 1000;
    expect(resetAt.getTime()).toBeGreaterThanOrEqual(before + oneHour - 100);
    expect(resetAt.getTime()).toBeLessThanOrEqual(after + oneHour + 100);
  });
});
