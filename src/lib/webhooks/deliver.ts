import { createHmac } from "crypto";
import { prisma } from "@/lib/db";

// 조직의 활성 웹훅 엔드포인트에 이벤트를 발송한다 (fire-and-forget)
export function deliverWebhooks(
  organizationId: string,
  event: string,
  data: Record<string, unknown>
): void {
  prisma.webhookEndpoint
    .findMany({ where: { organizationId, isActive: true } })
    .then((endpoints) => {
      if (endpoints.length === 0) return;

      const body = JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        organizationId,
        data,
      });

      for (const ep of endpoints) {
        const events: string[] = JSON.parse(ep.events);
        // events 빈 배열이면 전체 이벤트 수신
        if (events.length > 0 && !events.includes(event)) continue;

        const sig = createHmac("sha256", ep.secret).update(body).digest("hex");

        fetch(ep.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-FireQA-Event": event,
            "X-FireQA-Signature": `sha256=${sig}`,
            "X-FireQA-Endpoint-Id": ep.id,
          },
          body,
          signal: AbortSignal.timeout(10_000),
        }).catch((err) => console.error(`웹훅 전송 실패 [${ep.id}]:`, err));
      }
    })
    .catch(console.error);
}
