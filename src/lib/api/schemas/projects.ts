import { z } from "zod";

// GET /api/projects
export const getProjectsSchema = z.object({
  status: z
    .enum(["active", "archived", "deleted"])
    .optional()
    .default("active"),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
});

export type GetProjectsQuery = z.infer<typeof getProjectsSchema>;

// POST /api/projects
export const createProjectSchema = z.object({
  name: z.string().min(1, "프로젝트 이름은 필수입니다.").max(255),
  description: z.string().max(1000).optional().nullable(),
});

export type CreateProjectBody = z.infer<typeof createProjectSchema>;

// PUT /api/projects/[id]
export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  status: z.enum(["active", "archived"]).optional(),
});

export type UpdateProjectBody = z.infer<typeof updateProjectSchema>;

// DELETE /api/projects/[id]
export const deleteProjectParamsSchema = z.object({
  id: z.string().cuid(),
});

export type DeleteProjectParams = z.infer<typeof deleteProjectParamsSchema>;
