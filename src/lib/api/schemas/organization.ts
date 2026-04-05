import { z } from "zod";

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,46}[a-z0-9]$|^[a-z0-9]$/;

// PATCH /api/organization — 조직 정보 수정
export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(1, "조직 이름은 비워둘 수 없습니다.").optional(),
  slug: z
    .string()
    .regex(
      SLUG_REGEX,
      "슬러그는 소문자, 숫자, 하이픈만 사용할 수 있으며 1~48자여야 합니다.",
    )
    .optional(),
});
export type UpdateOrganizationBody = z.infer<typeof updateOrganizationSchema>;
