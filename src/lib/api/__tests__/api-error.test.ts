import { describe, it, expect, afterEach } from "vitest";
import { z } from "zod";
import { ApiError } from "../api-error";
import { ApiErrorCode } from "../api-error-codes";

describe("ApiError", () => {
  describe("constructor", () => {
    it("sets code, statusCode, message from options", () => {
      const err = new ApiError({
        code: ApiErrorCode.NOT_FOUND,
        message: "not found",
      });
      expect(err.code).toBe("NOT_FOUND");
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe("not found");
      expect(err.name).toBe("ApiError");
      expect(err).toBeInstanceOf(Error);
    });

    it("stores optional detail, context, cause", () => {
      const cause = new Error("original");
      const err = new ApiError({
        code: ApiErrorCode.INTERNAL_ERROR,
        message: "fail",
        detail: "some detail",
        context: { key: "val" },
        cause,
      });
      expect(err.detail).toBe("some detail");
      expect(err.context).toEqual({ key: "val" });
      expect(err.cause).toBe(cause);
    });

    it("defaults context to empty object", () => {
      const err = new ApiError({
        code: ApiErrorCode.UNAUTHORIZED,
        message: "no auth",
      });
      expect(err.context).toEqual({});
    });
  });

  describe("static factory methods", () => {
    it("unauthorized() → 401 UNAUTHORIZED", () => {
      const err = ApiError.unauthorized("no token");
      expect(err.code).toBe(ApiErrorCode.UNAUTHORIZED);
      expect(err.statusCode).toBe(401);
      expect(err.detail).toBe("no token");
    });

    it("forbidden() → 403 FORBIDDEN", () => {
      const err = ApiError.forbidden("admin only");
      expect(err.code).toBe(ApiErrorCode.FORBIDDEN);
      expect(err.statusCode).toBe(403);
      expect(err.detail).toBe("admin only");
    });

    it("notFound() → 404 NOT_FOUND with resource name", () => {
      const err = ApiError.notFound("프로젝트");
      expect(err.code).toBe(ApiErrorCode.NOT_FOUND);
      expect(err.statusCode).toBe(404);
      expect(err.message).toContain("프로젝트");
    });

    it("validationError() → 422 VALIDATION_ERROR with context", () => {
      const ctx = { field: "email" };
      const err = ApiError.validationError("invalid email", ctx);
      expect(err.code).toBe(ApiErrorCode.VALIDATION_ERROR);
      expect(err.statusCode).toBe(422);
      expect(err.context).toEqual(ctx);
    });

    it("conflict() → 409 CONFLICT", () => {
      const err = ApiError.conflict("프로젝트");
      expect(err.code).toBe(ApiErrorCode.CONFLICT);
      expect(err.statusCode).toBe(409);
      expect(err.message).toContain("프로젝트");
    });

    it("rateLimited() → 429 with resetAt context", () => {
      const resetAt = new Date("2026-01-01T00:00:00Z");
      const err = ApiError.rateLimited(resetAt);
      expect(err.code).toBe(ApiErrorCode.RATE_LIMITED);
      expect(err.statusCode).toBe(429);
      expect(err.message).toContain(resetAt.toISOString());
      expect(err.context).toEqual({ resetAt });
    });

    it("rateLimited() without resetAt", () => {
      const err = ApiError.rateLimited();
      expect(err.statusCode).toBe(429);
      expect(err.context).toEqual({});
    });

    it("insufficientCredits() → 402 with required/available", () => {
      const err = ApiError.insufficientCredits(100, 30);
      expect(err.code).toBe(ApiErrorCode.INSUFFICIENT_CREDITS);
      expect(err.statusCode).toBe(402);
      expect(err.context).toEqual({ required: 100, available: 30 });
    });

    it("planLimitExceeded() → 403 with resource/limit", () => {
      const err = ApiError.planLimitExceeded("프로젝트", 5);
      expect(err.code).toBe(ApiErrorCode.PLAN_LIMIT_EXCEEDED);
      expect(err.statusCode).toBe(403);
      expect(err.context).toEqual({ resource: "프로젝트", limit: 5 });
    });

    it("internalError() → 500 with cause", () => {
      const cause = new Error("db fail");
      const err = ApiError.internalError(cause, { url: "/api/test" });
      expect(err.code).toBe(ApiErrorCode.INTERNAL_ERROR);
      expect(err.statusCode).toBe(500);
      expect(err.detail).toBe("db fail");
      expect(err.cause).toBe(cause);
      expect(err.context).toEqual({ url: "/api/test" });
    });

    it("internalError() without cause", () => {
      const err = ApiError.internalError();
      expect(err.statusCode).toBe(500);
      expect(err.detail).toBeUndefined();
      expect(err.cause).toBeUndefined();
    });
  });

  describe("fromZodError()", () => {
    it("converts ZodError to ApiError with VALIDATION_ERROR code", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const result = schema.safeParse({ name: 123, age: "bad" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const err = ApiError.fromZodError(result.error);
        expect(err.code).toBe(ApiErrorCode.VALIDATION_ERROR);
        expect(err.statusCode).toBe(422);
        expect(err.message).toBe("입력 검증 실패");
        expect(err.context).toHaveProperty("errors");
        expect(err.context).toHaveProperty("field");
      }
    });

    it("captures first field name from flattened errors", () => {
      const schema = z.object({ email: z.string().email() });
      const result = schema.safeParse({ email: "not-email" });
      if (!result.success) {
        const err = ApiError.fromZodError(result.error);
        expect(err.context.field).toBe("email");
      }
    });
  });

  describe("toJSON()", () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it("includes error code and message", () => {
      const err = ApiError.notFound("item");
      const json = err.toJSON();
      expect(json).toHaveProperty("error", ApiErrorCode.NOT_FOUND);
      expect(json).toHaveProperty("message");
    });

    it("includes context when non-empty", () => {
      const err = ApiError.insufficientCredits(10, 3);
      const json = err.toJSON();
      expect(json).toHaveProperty("context", { required: 10, available: 3 });
    });

    it("excludes context when empty", () => {
      const err = ApiError.unauthorized();
      const json = err.toJSON();
      expect(json).not.toHaveProperty("context");
    });

    it("includes detail in development", () => {
      process.env.NODE_ENV = "development";
      const err = ApiError.internalError(new Error("db crash"));
      const json = err.toJSON();
      expect(json).toHaveProperty("detail", "db crash");
    });

    it("excludes detail in production", () => {
      process.env.NODE_ENV = "production";
      const err = ApiError.internalError(new Error("db crash"));
      const json = err.toJSON();
      expect(json).not.toHaveProperty("detail");
    });
  });

  describe("ERROR_STATUS_MAP coverage", () => {
    const codeToExpectedStatus: [ApiErrorCode, number][] = [
      [ApiErrorCode.UNAUTHORIZED, 401],
      [ApiErrorCode.INVALID_TOKEN, 401],
      [ApiErrorCode.TOKEN_EXPIRED, 401],
      [ApiErrorCode.FORBIDDEN, 403],
      [ApiErrorCode.PLAN_LIMIT_EXCEEDED, 403],
      [ApiErrorCode.INVALID_REQUEST, 400],
      [ApiErrorCode.MISSING_REQUIRED_FIELD, 400],
      [ApiErrorCode.INVALID_PARAMETER, 400],
      [ApiErrorCode.VALIDATION_ERROR, 422],
      [ApiErrorCode.UNPROCESSABLE, 422],
      [ApiErrorCode.NOT_FOUND, 404],
      [ApiErrorCode.GONE, 410],
      [ApiErrorCode.CONFLICT, 409],
      [ApiErrorCode.RESOURCE_LOCKED, 423],
      [ApiErrorCode.INSUFFICIENT_CREDITS, 402],
      [ApiErrorCode.RATE_LIMITED, 429],
      [ApiErrorCode.SERVICE_UNAVAILABLE, 503],
      [ApiErrorCode.PAYMENT_PROVIDER_ERROR, 503],
      [ApiErrorCode.DATABASE_ERROR, 500],
      [ApiErrorCode.INTERNAL_ERROR, 500],
    ];

    it.each(codeToExpectedStatus)(
      "%s maps to HTTP %i",
      (code, expectedStatus) => {
        const err = new ApiError({ code, message: "test" });
        expect(err.statusCode).toBe(expectedStatus);
      },
    );
  });
});
