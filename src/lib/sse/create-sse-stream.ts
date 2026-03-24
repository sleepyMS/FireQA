import type { SSEEvent } from "@/types/sse";

export interface SSEWriter {
  send(event: SSEEvent): void;
  close(): void;
  readonly closed: boolean;
}

/**
 * SSE 스트림 생성 유틸리티.
 * Response를 즉시 반환하고, writer를 통해 비동기적으로 이벤트를 전송한다.
 * 비동기 작업은 onStart 콜백에서 수행한다.
 */
export function createSSEStream(
  onStart: (writer: SSEWriter) => Promise<void>,
  signal?: AbortSignal
): Response {
  const encoder = new TextEncoder();
  let isClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Safari는 1024바이트까지 버퍼링하므로 padding 전송
      controller.enqueue(encoder.encode(`:padding${"_".repeat(1024)}\n\n`));

      const writer: SSEWriter = {
        send(event: SSEEvent) {
          if (isClosed) return;
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            );
          } catch {
            // ignored
          }
        },
        close() {
          if (isClosed) return;
          isClosed = true;
          clearInterval(heartbeat);
          try {
            controller.close();
          } catch {
            // ignored
          }
        },
        get closed() {
          return isClosed;
        },
      };

      // 15초 간격 하트비트 — 프록시/CDN 타임아웃 방지
      const heartbeat = setInterval(() => {
        if (isClosed) {
          clearInterval(heartbeat);
          return;
        }
        try {
          controller.enqueue(encoder.encode(`:heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15_000);

      // 클라이언트 연결 끊김 감지
      const onAbort = () => writer.close();
      signal?.addEventListener("abort", onAbort, { once: true });

      try {
        await onStart(writer);
      } catch (err) {
        if (!isClosed) {
          writer.send({
            type: "error",
            message:
              err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
          });
          writer.close();
        }
      } finally {
        // abort 리스너 정리 — signal 메모리 누수 방지
        signal?.removeEventListener("abort", onAbort);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
