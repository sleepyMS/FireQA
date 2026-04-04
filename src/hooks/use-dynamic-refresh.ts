"use client";

import { useCallback, useRef } from "react";

interface DynamicRefreshOptions<T> {
  /** Interval when data is actively changing (ms) */
  activeInterval: number;
  /** Interval when data has been idle (ms) */
  idleInterval: number;
  /** Number of consecutive unchanged responses before switching to idle (default: 3) */
  idleThreshold?: number;
  /** Lightweight fingerprint function for change detection. Falls back to JSON.stringify if omitted. */
  fingerprint?: (data: T) => string;
}

/**
 * Returns a dynamic `refreshInterval` value for SWR based on whether
 * the most recent fetch returned changed data.
 *
 * Usage:
 * ```
 * const { refreshInterval, onSuccess } = useDynamicRefresh({
 *   activeInterval: 5_000,
 *   idleInterval: 30_000,
 * });
 * const { data } = useSWR(key, fetcher, { refreshInterval, onSuccess });
 * ```
 */
export function useDynamicRefresh<T>({
  activeInterval,
  idleInterval,
  idleThreshold = 3,
  fingerprint,
}: DynamicRefreshOptions<T>) {
  const prevHashRef = useRef<string>("");
  const unchangedCountRef = useRef(0);
  const intervalRef = useRef(activeInterval);

  const onSuccess = useCallback(
    (data: T) => {
      const hash = fingerprint ? fingerprint(data) : JSON.stringify(data);
      if (hash === prevHashRef.current) {
        unchangedCountRef.current++;
      } else {
        unchangedCountRef.current = 0;
        prevHashRef.current = hash;
      }

      intervalRef.current =
        unchangedCountRef.current >= idleThreshold
          ? idleInterval
          : activeInterval;
    },
    [activeInterval, idleInterval, idleThreshold, fingerprint],
  );

  return {
    /** Pass this as SWR's `refreshInterval`. Reads the latest computed value. */
    get refreshInterval() {
      return intervalRef.current;
    },
    /** Pass this as SWR's `onSuccess` callback. */
    onSuccess,
  };
}
