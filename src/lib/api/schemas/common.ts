import { z } from "zod";

// ─── 기본 타입 ───
export const cuidSchema = z.string().cuid();
export const emailSchema = z.string().email("유효한 이메일을 입력해주세요.");
export const urlSchema = z.string().url("유효한 URL을 입력해주세요.");
export const isoDateSchema = z.string().datetime();

// ─── 페이지네이션 ───
export const cursorPaginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
});

export const offsetPaginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
});

// ─── 조직 & 권한 ───
export const organizationIdSchema = z.object({
  organizationId: cuidSchema,
});

// ─── 소프트 삭제 상태 ───
export const statusSchema = z.enum(["active", "archived", "deleted"]).optional();
