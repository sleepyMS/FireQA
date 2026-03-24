"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SSEEvent } from "@/types/sse";
import { consumeSSEStream } from "@/lib/sse/parse-sse-client";

interface UseSSEState<T> {
  stage: string;
  message: string;
  progress: number;
  chunkInfo: { index: number; total: number } | null;
  charsReceived: number;
  jobId: string | null;
  isStreaming: boolean;
  result: T | null;
  error: string | null;
}

const INITIAL_STATE: UseSSEState<unknown> = {
  stage: "",
  message: "",
  progress: 0,
  chunkInfo: null,
  charsReceived: 0,
  jobId: null,
  isStreaming: false,
  result: null,
  error: null,
};

export function useSSE<T>(url: string) {
  const [state, setState] = useState<UseSSEState<T>>(
    INITIAL_STATE as UseSSEState<T>
  );

  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const start = useCallback(
    (body: FormData) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({
        stage: "connecting",
        message: "연결 중...",
        progress: 0,
        chunkInfo: null,
        charsReceived: 0,
        jobId: null,
        isStreaming: true,
        result: null,
        error: null,
      });

      (async () => {
        try {
          let completed = false;

          await consumeSSEStream(
            url,
            { method: "POST", body, signal: controller.signal },
            (event) => {
              if (!mountedRef.current) return;
              handleEvent(event);
              if (event.type === "complete" || event.type === "error") {
                completed = true;
              }
            }
          );

          if (!completed && mountedRef.current) {
            setState((prev) =>
              prev.isStreaming
                ? { ...prev, isStreaming: false, error: "스트림이 예상치 않게 종료되었습니다." }
                : prev
            );
          }
        } catch (err) {
          if ((err as Error).name === "AbortError" || !mountedRef.current) return;
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            error: err instanceof Error ? err.message : "연결에 실패했습니다.",
          }));
        }
      })();

      function handleEvent(event: SSEEvent) {
        switch (event.type) {
          case "job_created":
            setState((prev) => ({ ...prev, jobId: event.jobId }));
            break;
          case "stage":
            setState((prev) =>
              prev.stage === event.stage && prev.progress === (event.progress ?? prev.progress)
                ? prev
                : { ...prev, stage: event.stage, message: event.message, progress: event.progress ?? prev.progress }
            );
            break;
          case "chunk_progress":
            setState((prev) => ({
              ...prev,
              chunkInfo: { index: event.index, total: event.total },
              charsReceived: event.charsSoFar,
            }));
            break;
          case "progress":
            setState((prev) =>
              prev.charsReceived === event.charsReceived
                ? prev
                : { ...prev, charsReceived: event.charsReceived }
            );
            break;
          case "complete":
            setState((prev) => ({
              ...prev,
              isStreaming: false,
              result: event.data as T,
              progress: 100,
            }));
            break;
          case "error":
            setState((prev) => ({
              ...prev,
              isStreaming: false,
              error: event.message,
            }));
            break;
        }
      }
    },
    [url]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => (prev.isStreaming ? { ...prev, isStreaming: false } : prev));
  }, []);

  return { ...state, start, cancel };
}
