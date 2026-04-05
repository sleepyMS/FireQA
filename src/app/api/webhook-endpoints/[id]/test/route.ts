import { withApiHandler } from "@/lib/api/with-api-handler";
import { prisma } from "@/lib/db";
import { UserRole } from "@/types/enums";
import { deliverToEndpoint } from "@/lib/webhooks/deliver";

export const POST = withApiHandler(
  async ({ user, params }) => {
    const endpoint = await prisma.webhookEndpoint.findUnique({
      where: { id: params.id },
    });

    if (!endpoint || endpoint.organizationId !== user.organizationId) {
      const { ApiError } = await import("@/lib/api/api-error");
      throw ApiError.notFound("엔드포인트를 찾을 수 없습니다.");
    }

    const payload = {
      event: "test.ping",
      timestamp: new Date().toISOString(),
      organizationId: user.organizationId,
      data: { message: "This is a test webhook delivery" },
    };

    const result = await deliverToEndpoint(
      endpoint.id,
      endpoint.url,
      endpoint.secret,
      "test.ping",
      payload,
    );

    return result;
  },
  { minRole: UserRole.ADMIN },
);
