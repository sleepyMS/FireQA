"use client";

import { useState, useEffect, useCallback } from "react";
import { ActivityItem } from "./activity-item";
import { Button } from "@/components/ui/button";

interface ActivityLog {
  id: string;
  action: string;
  actorId: string | null;
  projectId: string | null;
  jobId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface ActivityTimelineProps {
  // projectId가 제공되면 해당 프로젝트로 필터링 의도이나,
  // 현재 API가 프로젝트 필터를 지원하지 않으므로 전체 목록을 가져온다.
  projectId?: string;
}

// 로딩 스켈레톤 행
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

export function ActivityTimeline({ projectId: _projectId }: ActivityTimelineProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchLogs = useCallback(async (cursor?: string) => {
    const url = cursor
      ? `/api/activity?limit=20&cursor=${encodeURIComponent(cursor)}`
      : "/api/activity?limit=20";

    const res = await fetch(url);
    if (!res.ok) throw new Error("활동 로그 조회 실패");
    return res.json() as Promise<{ logs: ActivityLog[]; nextCursor: string | null }>;
  }, []);

  // 초기 로드
  useEffect(() => {
    setLoading(true);
    fetchLogs()
      .then(({ logs: items, nextCursor: cursor }) => {
        setLogs(items);
        setNextCursor(cursor);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fetchLogs]);

  // 더 보기
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
