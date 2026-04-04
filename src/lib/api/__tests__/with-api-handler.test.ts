import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { NextRequest } from "next/server";
import { ApiError } from "../api-error";
import { ApiErrorCode } from "../api-error-codes";
import type { AuthUser } from "@/lib/auth/get-current-user";

// ─── Mocks ───

const mockGetCurrentUser = vi.fn<() => Promise<AuthUser | null>>();
const mockHasRole = vi.fn<(userRole: string, minRole: string) => boolean>();

vi.mock("@/lib/auth/get-current-user", () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...(args as [])),
}));

vi.mock("@/lib/auth/require-role", () => ({
  hasRole: (...args: unknown[]) => mockHasRole(...(args as [string, string])),
}));

// Import after mocks are set up
const { withApiHandler } = await import("../with-api-handler");

// ─── Helpers ───

const TEST_URL = "http://localhost:3000/api/test";

function makeRequest(
  method: string,
  opts?: { body?: unknown; searchParams?: Record<string, string> },
): NextRequest {
  const url = new URL(TEST_URL);
  if (opts?.searchParams) {
    for (const [k, v] of Object.entries(opts.searchParams)) {
      url.searchParams.set(k, v);
    }
  }
  const init: RequestInit = { method };
  if (opts?.body !== undefined) {
    init.body = JSON.stringify(opts.body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(url, init);
}

const fakeUser: AuthUser = {
  userId: "user-1",
  organizationId: "org-1",
  email: "test@example.com",
  name: "Tester",
  role: "MEMBER",
};

// ─── Tests ───

describe("withApiHandler", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockGetCurrentUser.mockResolvedValue(null);
    mockHasRole.mockReturnValue(true);
  });

  describe("authentication", () => {
    it("returns 401 when requireAuth=true and no user", async () => {
      const handler = withApiHandler(async () => ({ ok: true }), {
        requireAuth: true,
      });

      const res = await handler(makeRequest("GET"));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe(ApiErrorCode.UNAUTHORIZED);
    });

    it("allows unauthenticated access when requireAuth=false", async () => {
      const handler = withApiHandler(async () => ({ ok: true }), {
        requireAuth: false,
      });

      const res = await handler(makeRequest("GET"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });

    it("passes authenticated user to handler", async () => {
      mockGetCurrentUser.mockResolvedValue(fakeUser);
      const handler = withApiHandler(async ({ user }) => ({ userId: user?.userId }));

      const res = await handler(makeRequest("GET"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.userId).toBe("user-1");
    });
  });

  describe("authorization (minRole)", () => {
    it("returns 403 when user lacks required role", async () => {
      mockGetCurrentUser.mockResolvedValue(fakeUser);
      mockHasRole.mockReturnValue(false);

      const handler = withApiHandler(async () => ({ ok: true }), {
        minRole: "ADMIN",
      });

      const res = await handler(makeRequest("GET"));
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe(ApiErrorCode.FORBIDDEN);
    });

    it("allows user with sufficient role", async () => {
      mockGetCurrentUser.mockResolvedValue(fakeUser);
      mockHasRole.mockReturnValue(true);

      const handler = withApiHandler(async () => ({ ok: true }), {
        minRole: "MEMBER",
      });

      const res = await handler(makeRequest("GET"));
      expect(res.status).toBe(200);
    });
  });

  describe("body validation", () => {
    const bodySchema = z.object({
      name: z.string().min(1),
      count: z.number(),
    });

    it("returns 422 when body fails validation", async () => {
      mockGetCurrentUser.mockResolvedValue(fakeUser);
      const handler = withApiHandler(async () => ({ ok: true }), { bodySchema });

      const res = await handler(
        makeRequest("POST", { body: { name: "", count: "bad" } }),
      );
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error).toBe(ApiErrorCode.VALIDATION_ERROR);
    });

    it("passes validated body to handler", async () => {
      mockGetCurrentUser.mockResolvedValue(fakeUser);
      const handler = withApiHandler(
        async ({ body }) => ({ received: body }),
        { bodySchema },
      );

      const res = await handler(
        makeRequest("POST", { body: { name: "test", count: 42 } }),
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.received).toEqual({ name: "test", count: 42 });
    });

    it("returns 400 for invalid JSON body", async () => {
      mockGetCurrentUser.mockResolvedValue(fakeUser);
      const handler = withApiHandler(async () => ({ ok: true }), { bodySchema });

      // NextRequest with non-JSON body
      const req = new NextRequest(TEST_URL, {
        method: "POST",
        body: "not json{{{",
        headers: { "Content-Type": "application/json" },
      });

      const res = await handler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe(ApiErrorCode.INVALID_REQUEST);
    });
  });

  describe("query validation", () => {
    const querySchema = z.object({
      page: z.coerce.number().min(1),
    });

    it("returns 422 when query fails validation", async () => {
      mockGetCurrentUser.mockResolvedValue(fakeUser);
      const handler = withApiHandler(async () => ({ ok: true }), { querySchema });

      const res = await handler(
        makeRequest("GET", { searchParams: { page: "0" } }),
      );
      expect(res.status).toBe(422);
    });

    it("passes validated query to handler", async () => {
      mockGetCurrentUser.mockResolvedValue(fakeUser);
      const handler = withApiHandler(
        async ({ query }) => ({ page: query.page }),
        { querySchema },
      );

      const res = await handler(
        makeRequest("GET", { searchParams: { page: "3" } }),
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.page).toBe(3);
    });
  });

  describe("handler execution", () => {
    it("returns 200 with handler result by default", async () => {
      mockGetCurrentUser.mockResolvedValue(fakeUser);
      const handler = withApiHandler(async () => ({ items: [1, 2, 3] }));

      const res = await handler(makeRequest("GET"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.items).toEqual([1, 2, 3]);
    });

    it("uses custom successStatus", async () => {
      mockGetCurrentUser.mockResolvedValue(fakeUser);
      const handler = withApiHandler(async () => ({ id: "new" }), {
        successStatus: 201,
      });

      const res = await handler(makeRequest("POST"));
      expect(res.status).toBe(201);
    });

    it("passes through NextResponse directly from handler", async () => {
      const { NextResponse } = await import("next/server");
      mockGetCurrentUser.mockResolvedValue(fakeUser);

      const handler = withApiHandler(async () => {
        return NextResponse.json({ custom: true }, { status: 202 });
      });

      const res = await handler(makeRequest("GET"));
      expect(res.status).toBe(202);
      const body = await res.json();
      expect(body.custom).toBe(true);
    });
  });

  describe("error handling", () => {
    it("returns correct status when handler throws ApiError", async () => {
      mockGetCurrentUser.mockResolvedValue(fakeUser);
      const handler = withApiHandler(async () => {
        throw ApiError.notFound("리소스");
      });

      const res = await handler(makeRequest("GET"));
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe(ApiErrorCode.NOT_FOUND);
      expect(res.headers.get("X-Error-Code")).toBe("NOT_FOUND");
    });

    it("returns 500 when handler throws generic Error", async () => {
      mockGetCurrentUser.mockResolvedValue(fakeUser);
      // Suppress console.error in this test
      vi.spyOn(console, "error").mockImplementation(() => {});

      const handler = withApiHandler(async () => {
        throw new Error("unexpected");
      });

      const res = await handler(makeRequest("GET"));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe(ApiErrorCode.INTERNAL_ERROR);
    });

    it("returns 500 when handler throws non-Error value", async () => {
      mockGetCurrentUser.mockResolvedValue(fakeUser);
      vi.spyOn(console, "error").mockImplementation(() => {});

      const handler = withApiHandler(async () => {
        throw "string error";
      });

      const res = await handler(makeRequest("GET"));
      expect(res.status).toBe(500);
    });
  });

  describe("params resolution", () => {
    it("resolves async params (Next.js 16 style)", async () => {
      mockGetCurrentUser.mockResolvedValue(fakeUser);
      const handler = withApiHandler(
        async ({ params }) => ({ id: params.id }),
      );

      const res = await handler(makeRequest("GET"), {
        params: Promise.resolve({ id: "abc" }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe("abc");
    });

    it("handles missing segmentData gracefully", async () => {
      mockGetCurrentUser.mockResolvedValue(fakeUser);
      const handler = withApiHandler(
        async ({ params }) => ({ params }),
      );

      const res = await handler(makeRequest("GET"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.params).toEqual({});
    });
  });
});
