import { z } from "zod";

export const updateWireframeScreenSchema = z.object({
  jobId: z.string().cuid(),
  screenId: z.string(),
  screenType: z.string().min(1),
});

export type UpdateWireframeScreenBody = z.infer<typeof updateWireframeScreenSchema>;
