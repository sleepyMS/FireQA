import { describe, it, expect } from "vitest";
import {
  cuidSchema,
  emailSchema,
  urlSchema,
  isoDateSchema,
  cursorPaginationSchema,
  offsetPaginationSchema,
  organizationIdSchema,
  statusSchema,
} from "../schemas/common";
import {
  getProjectsSchema,
  createProjectSchema,
  updateProjectSchema,
  deleteProjectParamsSchema,
} from "../schemas/projects";
import {
  getCommentsSchema,
  createCommentSchema,
} from "../schemas/comments";

// ─── Common Schemas ───

describe("common schemas", () => {
  describe("cuidSchema", () => {
    it("accepts valid CUID", () => {
      expect(cuidSchema.safeParse("clh4o2k000000ld08t3v4q3rw").success).toBe(true);
    });

    it("rejects empty string", () => {
      expect(cuidSchema.safeParse("").success).toBe(false);
    });

    it("rejects non-cuid string", () => {
      expect(cuidSchema.safeParse("not-a-cuid").success).toBe(false);
    });
  });

  describe("emailSchema", () => {
    it("accepts valid email", () => {
      expect(emailSchema.safeParse("user@example.com").success).toBe(true);
    });

    it("rejects invalid email", () => {
      const result = emailSchema.safeParse("not-an-email");
      expect(result.success).toBe(false);
    });
  });

  describe("urlSchema", () => {
    it("accepts valid URL", () => {
      expect(urlSchema.safeParse("https://example.com").success).toBe(true);
    });

    it("rejects invalid URL", () => {
      expect(urlSchema.safeParse("not-a-url").success).toBe(false);
    });
  });

  describe("isoDateSchema", () => {
    it("accepts ISO datetime string", () => {
      expect(isoDateSchema.safeParse("2026-01-01T00:00:00Z").success).toBe(true);
    });

    it("rejects non-datetime string", () => {
      expect(isoDateSchema.safeParse("yesterday").success).toBe(false);
    });
  });

  describe("cursorPaginationSchema", () => {
    it("applies default limit=20 when omitted", () => {
      const result = cursorPaginationSchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.cursor).toBeUndefined();
    });

    it("coerces string limit to number", () => {
      const result = cursorPaginationSchema.parse({ limit: "10" });
      expect(result.limit).toBe(10);
    });

    it("rejects limit < 1", () => {
      expect(cursorPaginationSchema.safeParse({ limit: 0 }).success).toBe(false);
    });

    it("rejects limit > 100", () => {
      expect(cursorPaginationSchema.safeParse({ limit: 101 }).success).toBe(false);
    });

    it("accepts optional cursor", () => {
      const result = cursorPaginationSchema.parse({ cursor: "abc123" });
      expect(result.cursor).toBe("abc123");
    });
  });

  describe("offsetPaginationSchema", () => {
    it("applies defaults limit=20, offset=0", () => {
      const result = offsetPaginationSchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("coerces string values to numbers", () => {
      const result = offsetPaginationSchema.parse({ limit: "5", offset: "10" });
      expect(result.limit).toBe(5);
      expect(result.offset).toBe(10);
    });

    it("rejects negative offset", () => {
      expect(offsetPaginationSchema.safeParse({ offset: -1 }).success).toBe(false);
    });
  });

  describe("organizationIdSchema", () => {
    it("accepts valid cuid organizationId", () => {
      const result = organizationIdSchema.safeParse({
        organizationId: "clh4o2k000000ld08t3v4q3rw",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing organizationId", () => {
      expect(organizationIdSchema.safeParse({}).success).toBe(false);
    });
  });

  describe("statusSchema", () => {
    it("accepts 'active', 'archived', 'deleted'", () => {
      expect(statusSchema.safeParse("active").success).toBe(true);
      expect(statusSchema.safeParse("archived").success).toBe(true);
      expect(statusSchema.safeParse("deleted").success).toBe(true);
    });

    it("accepts undefined (optional)", () => {
      expect(statusSchema.safeParse(undefined).success).toBe(true);
    });

    it("rejects invalid status", () => {
      expect(statusSchema.safeParse("invalid").success).toBe(false);
    });
  });
});

// ─── Project Schemas ───

describe("project schemas", () => {
  describe("getProjectsSchema", () => {
    it("applies defaults: status=active, limit=20", () => {
      const result = getProjectsSchema.parse({});
      expect(result.status).toBe("active");
      expect(result.limit).toBe(20);
    });

    it("accepts all valid fields", () => {
      const result = getProjectsSchema.parse({
        status: "archived",
        search: "test",
        limit: "50",
        cursor: "abc",
      });
      expect(result.status).toBe("archived");
      expect(result.search).toBe("test");
      expect(result.limit).toBe(50);
      expect(result.cursor).toBe("abc");
    });

    it("rejects invalid status value", () => {
      expect(getProjectsSchema.safeParse({ status: "invalid" }).success).toBe(false);
    });
  });

  describe("createProjectSchema", () => {
    it("accepts valid project", () => {
      const result = createProjectSchema.parse({ name: "My Project" });
      expect(result.name).toBe("My Project");
      expect(result.description).toBeUndefined();
    });

    it("accepts name with optional nullable description", () => {
      const result = createProjectSchema.parse({
        name: "Test",
        description: null,
      });
      expect(result.description).toBeNull();
    });

    it("rejects empty name", () => {
      expect(createProjectSchema.safeParse({ name: "" }).success).toBe(false);
    });

    it("rejects name exceeding 255 chars", () => {
      expect(
        createProjectSchema.safeParse({ name: "x".repeat(256) }).success,
      ).toBe(false);
    });

    it("rejects description exceeding 1000 chars", () => {
      expect(
        createProjectSchema.safeParse({
          name: "ok",
          description: "x".repeat(1001),
        }).success,
      ).toBe(false);
    });
  });

  describe("updateProjectSchema", () => {
    it("accepts partial update (all fields optional)", () => {
      const result = updateProjectSchema.parse({});
      expect(result.name).toBeUndefined();
      expect(result.status).toBeUndefined();
    });

    it("accepts valid status values", () => {
      expect(updateProjectSchema.parse({ status: "active" }).status).toBe("active");
      expect(updateProjectSchema.parse({ status: "archived" }).status).toBe("archived");
    });

    it("rejects 'deleted' status (not allowed in update)", () => {
      expect(
        updateProjectSchema.safeParse({ status: "deleted" }).success,
      ).toBe(false);
    });
  });

  describe("deleteProjectParamsSchema", () => {
    it("accepts valid cuid", () => {
      const result = deleteProjectParamsSchema.safeParse({
        id: "clh4o2k000000ld08t3v4q3rw",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing id", () => {
      expect(deleteProjectParamsSchema.safeParse({}).success).toBe(false);
    });

    it("rejects non-cuid id", () => {
      expect(
        deleteProjectParamsSchema.safeParse({ id: "123" }).success,
      ).toBe(false);
    });
  });
});

// ─── Comment Schemas ───

describe("comment schemas", () => {
  describe("getCommentsSchema", () => {
    it("accepts valid jobId", () => {
      const result = getCommentsSchema.parse({ jobId: "job-123" });
      expect(result.jobId).toBe("job-123");
    });

    it("rejects empty jobId", () => {
      expect(getCommentsSchema.safeParse({ jobId: "" }).success).toBe(false);
    });

    it("rejects missing jobId", () => {
      expect(getCommentsSchema.safeParse({}).success).toBe(false);
    });
  });

  describe("createCommentSchema", () => {
    it("accepts valid comment with required fields", () => {
      const result = createCommentSchema.parse({
        jobId: "job-1",
        body: "Hello",
      });
      expect(result.jobId).toBe("job-1");
      expect(result.body).toBe("Hello");
      expect(result.targetItemId).toBeUndefined();
      expect(result.parentId).toBeUndefined();
    });

    it("accepts nullable optional fields", () => {
      const result = createCommentSchema.parse({
        jobId: "job-1",
        body: "Reply",
        targetItemId: null,
        parentId: "parent-1",
      });
      expect(result.targetItemId).toBeNull();
      expect(result.parentId).toBe("parent-1");
    });

    it("rejects empty body", () => {
      expect(
        createCommentSchema.safeParse({ jobId: "job-1", body: "" }).success,
      ).toBe(false);
    });

    it("rejects body exceeding 10000 chars", () => {
      expect(
        createCommentSchema.safeParse({
          jobId: "job-1",
          body: "x".repeat(10_001),
        }).success,
      ).toBe(false);
    });

    it("rejects empty jobId", () => {
      expect(
        createCommentSchema.safeParse({ jobId: "", body: "text" }).success,
      ).toBe(false);
    });
  });
});
