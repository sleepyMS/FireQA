import { prisma } from "@/lib/db";
import {
  withApiHandler,
  ApiError,
  updateWireframeScreenSchema,
  type UpdateWireframeScreenBody,
} from "@/lib/api";

export const PATCH = withApiHandler<UpdateWireframeScreenBody>(
  async ({ body }) => {
    const { jobId, screenId, screenType } = body;

    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
      select: { id: true, result: true },
    });

    if (!job || !job.result) {
      throw ApiError.notFound("Job");
    }

    const result = JSON.parse(job.result);
    const screen = result.screens?.find(
      (s: { id: string }) => s.id === screenId,
    );

    if (!screen) {
      throw ApiError.notFound("해당 화면");
    }

    screen.screenType = screenType;

    await prisma.generationJob.update({
      where: { id: jobId },
      data: { result: JSON.stringify(result) },
    });

    return { success: true };
  },
  { bodySchema: updateWireframeScreenSchema },
);
