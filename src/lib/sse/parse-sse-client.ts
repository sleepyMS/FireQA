import type { SSEEvent } from "@/types/sse";

/**
 * SSE 스트림을 fetch로 시작하고, 각 이벤트를 onEvent 콜백으로 전달.
 * JSON 에러 응답인 경우 에러를 throw.
 */
export async function consumeSSEStream(
  url: string,
  init: RequestInit,
  onEvent: (event: SSEEvent) => void
): Promise<void> {
  const response = await fetch(url, init);

  // validation 에러 등 SSE가 아닌 JSON 응답 처리
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json();
    throw new Error(data.error || "요청에 실패했습니다.");
  }

  if (!response.body) {
    throw new Error("스트림을 읽을 수 없습니다.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      parseSSELines(part, onEvent);
    }
  }

  // 스트림 종료 후 남은 버퍼 처리
  if (buffer.trim()) {
    parseSSELines(buffer, onEvent);
  }
}

function parseSSELines(chunk: string, onEvent: (event: SSEEvent) => void) {
  for (const line of chunk.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    try {
      onEvent(JSON.parse(line.slice(6)));
    } catch {
      // 파싱 실패 — 무시
    }
  }
}
