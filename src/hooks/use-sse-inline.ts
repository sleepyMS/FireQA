"use client";

import { useCallback, useRef, useState } from "react";
import type { SSEEvent } from "@/types/sse";
import { consumeSSEStream } from "@/lib/sse/parse-sse-client";

interface UseSSEInlineState {
  isStreaming: boolean;
  stage: string;
  charsReceived: number;
}

/**
 * 인라인 SSE 훅 — fix-mermaid, improve-diagram 같은 즉시 응답 엔드포인트용.
 * execute()가 Promise를 반환하여 기존 코드에 최소 변경으로 통합 가능.
 */
export function useSSEInline<T>(url: string) {
  const [state, setState] = useState<UseSSEInlineState>({
    isStreaming: false,
    stage: "",
    charsReceived: 0,
  });

  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    (body: Record<string, unknown>): Promise<T> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({ isStreaming: true, stage: "", charsReceived: 0 });

      return new Promise<T>((resolve, reject) => {
        let settled = false;

        consumeSSEStream(
          url,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
          },
          (event: SSEEvent) => {
            switch (event.type) {
              case "stage":
                setState((prev) =>
                  prev.stage === event.stage ? prev : { ...prev, stage: event.stage }
                );
                break;
              case "progress":
                setState((prev) =>
                  prev.charsReceived === event.charsReceived
                    ? prev
                    : { ...prev, charsReceived: event.charsReceived }
                );
                break;
              case "complete":
                settled = true;
                setState((prev) => ({ ...prev, isStreaming: false }));
                resolve(event.data as T);
                break;
              case "error":
                settled = true;
                setState((prev) => ({ ...prev, isStreaming: false }));
                reject(new Error(event.message));
                break;
            }
          }
        )
          .then(() => {
            if (!settled) {
              setState((prev) => ({ ...prev, isStreaming: false }));
              reject(new Error("스트림이 예상치 않게 종료되었습니다."));
            }
          })
          .catch((err) => {
            setState((prev) => ({ ...prev, isStreaming: false }));
            if ((err as Error).name === "AbortError") {
              reject(new Error("취소되었습니다."));
              return;
            }
            if (!settled) reject(err);
          });
      });
    },
    [url]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => (prev.isStreaming ? { ...prev, isStreaming: false } : prev));
  }, []);

  return { ...state, execute, cancel };
}
