import { withApiHandler } from "@/lib/api/with-api-handler";
import { prisma } from "@/lib/db";
import { UserRole } from "@/types/enums";

export const GET = withApiHandler(
  async ({ user, params }) => {
    const endpoint = await prisma.webhookEndpoint.findUnique({
      where: { id: params.id },
      select: { id: true, organizationId: true },
    });

    if (!endpoint || endpoint.organizationId !== user.organizationId) {
      const { ApiError } = await import("@/lib/api/api-error");
      throw ApiError.notFound("엔드포인트를 찾을 수 없습니다.");
    }

    const deliveries = await prisma.webhookDelivery.findMany({
      where: { endpointId: params.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return { deliveries };
  },
  { minRole: UserRole.ADMIN },
);
