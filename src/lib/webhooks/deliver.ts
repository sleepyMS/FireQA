import { createHmac } from "crypto";
import { prisma } from "@/lib/db";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "webhooks" });

const MAX_ATTEMPTS = 3;
const BACKOFF_SECONDS = [1, 5, 30];
const RESPONSE_BODY_MAX_LENGTH = 500;

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

async function sendWithRetry(
  url: string,
  headers: Record<string, string>,
  body: string,
  endpointId: string,
  event: string,
): Promise<void> {
  let lastStatus: number | null = null;
  let lastResponseBody: string | null = null;
  let success = false;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10_000),
      });

      lastStatus = res.status;
      try {
        const text = await res.text();
        lastResponseBody = truncate(text, RESPONSE_BODY_MAX_LENGTH);
      } catch {
        lastResponseBody = null;
      }

      if (res.ok) {
        success = true;
        await prisma.webhookDelivery.create({
          data: {
            endpointId,
            event,
            requestBody: body,
            responseStatus: lastStatus,
            responseBody: lastResponseBody,
            success: true,
            attempts: attempt,
            lastAttemptAt: new Date(),
          },
        });
        return;
      }

      logger.warn("웹훅 전송 비정상 응답", {
        endpointId,
        attempt,
        status: lastStatus,
      });
    } catch (err) {
      logger.error("웹훅 전송 실패", {
        endpointId,
        attempt,
        error: err,
      });
    }

    // 마지막 시도가 아니면 백오프 후 재시도
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, BACKOFF_SECONDS[attempt - 1] * 1000));
    }
  }

  // 모든 재시도 실패 — 전달 기록 저장
  await prisma.webhookDelivery.create({
    data: {
      endpointId,
      event,
      requestBody: body,
      responseStatus: lastStatus,
      responseBody: lastResponseBody,
      success: false,
      attempts: MAX_ATTEMPTS,
      lastAttemptAt: new Date(),
    },
  });
}

// 조직의 활성 웹훅 엔드포인트에 이벤트를 발송한다 (fire-and-forget)
export function deliverWebhooks(
  organizationId: string,
  event: string,
  data: Record<string, unknown>,
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

        sendWithRetry(
          ep.url,
          {
            "Content-Type": "application/json",
            "X-FireQA-Event": event,
            "X-FireQA-Signature": `sha256=${sig}`,
            "X-FireQA-Endpoint-Id": ep.id,
          },
          body,
          ep.id,
          event,
        ).catch((err) => logger.error("웹훅 전달 기록 저장 실패", { endpointId: ep.id, error: err }));
      }
    })
    .catch((err) => logger.error("웹훅 엔드포인트 조회 실패", { error: err }));
}

// 단일 엔드포인트에 직접 전송하고 결과 반환 (테스트 전송용)
export async function deliverToEndpoint(
  endpointId: string,
  url: string,
  secret: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const body = JSON.stringify(payload);
  const sig = createHmac("sha256", secret).update(body).digest("hex");

  let statusCode: number | undefined;
  let responseBody: string | null = null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-FireQA-Event": event,
        "X-FireQA-Signature": `sha256=${sig}`,
        "X-FireQA-Endpoint-Id": endpointId,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    statusCode = res.status;
    try {
      const text = await res.text();
      responseBody = truncate(text, RESPONSE_BODY_MAX_LENGTH);
    } catch {
      responseBody = null;
    }

    await prisma.webhookDelivery.create({
      data: {
        endpointId,
        event,
        requestBody: body,
        responseStatus: statusCode,
        responseBody,
        success: res.ok,
        attempts: 1,
        lastAttemptAt: new Date(),
      },
    });

    return res.ok
      ? { success: true, statusCode }
      : { success: false, statusCode, error: `HTTP ${statusCode}` };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    await prisma.webhookDelivery.create({
      data: {
        endpointId,
        event,
        requestBody: body,
        responseStatus: null,
        responseBody: null,
        success: false,
        attempts: 1,
        lastAttemptAt: new Date(),
      },
    }).catch((e) => logger.error("테스트 전송 기록 저장 실패", { error: e }));

    return { success: false, error: errorMessage };
  }
}
