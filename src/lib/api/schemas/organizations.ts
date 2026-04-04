import { z } from "zod";

// POST /api/organizations
export const createOrganizationSchema = z.object({
  name: z.string().min(1, "팀 이름은 필수입니다.").max(100, "팀 이름은 100자 이하여야 합니다."),
  slug: z.string().optional(),
});

export type CreateOrganizationBody = z.infer<typeof createOrganizationSchema>;
