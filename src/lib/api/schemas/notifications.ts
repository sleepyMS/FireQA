import { z } from "zod";

// GET /api/notifications
export const getNotificationsSchema = z.object({
  all: z.enum(["0", "1"]).optional(),
});

export type GetNotificationsQuery = z.infer<typeof getNotificationsSchema>;
