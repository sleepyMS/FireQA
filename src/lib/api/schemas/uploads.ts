import { z } from "zod";

// GET /api/uploads/[id]
export const getUploadSchema = z.object({
  download: z.enum(["0", "1"]).optional(),
});

export type GetUploadQuery = z.infer<typeof getUploadSchema>;
