"use client";

import { useState, useEffect, useCallback } from "react";
import { ActivityItem } from "./activity-item";
import { Button } from "@/components/ui/button";
import type { ActivityLog } from "@/types/activity";

interface ActivityTimelineProps {
  projectId?: string;
}

function SkeletonRow() {
  return (
    <div className="relative flex items-start gap-4 pb-6 pl-8 animate-pulse">
      <div className="absolute left-0 h-8 w-8 rounded-full bg-muted" />
      <div className="flex flex-1 items-center justify-between gap-2 pt-1">
        <div className="h-4 w-48 rounded bg-muted" />
        <div className="h-3 w-12 rounded bg-muted" />
      </div>
    </div>
  );
}

export function ActivityTimeline({ projectId }: ActivityTimelineProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchLogs = useCallback(async (cursor?: string, signal?: AbortSignal) => {
    const params = new URLSearchParams({ limit: "20" });
    if (projectId) params.set("projectId", projectId);
    if (cursor) params.set("cursor", cursor);
    const url = `/api/activity?${params}`;

    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error("활동 로그 조회 실패");
    return res.json() as Promise<{ logs: ActivityLog[]; nextCursor: string | null }>;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLogs([]);
    setNextCursor(null);
    setLoading(true);
    fetchLogs(undefined, controller.signal)
      .then(({ logs: items, nextCursor: cursor }) => {
        setLogs(items);
        setNextCursor(cursor);
      })
      .catch((err) => {
        if (err.name !== "AbortError") console.error(err);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [fetchLogs, projectId]);

  const handleLoadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const { logs: more, nextCursor: cursor } = await fetchLogs(nextCursor);
      setLogs((prev) => [...prev, ...more]);
      setNextCursor(cursor);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="relative">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        아직 활동 기록이 없습니다.
      </p>
    );
  }

  return (
    <div>
      <div className="relative">
        {logs.map((log) => (
          <ActivityItem key={log.id} log={log} />
        ))}
      </div>
      {nextCursor && (
        <div className="mt-2 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "불러오는 중..." : "더 보기"}
          </Button>
        </div>
      )}
    </div>
  );
}
