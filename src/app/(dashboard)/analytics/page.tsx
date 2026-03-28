"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { JOB_TYPE_LABEL } from "@/types/enums";
import { SWR_KEYS } from "@/lib/swr/keys";

interface AnalyticsData {
  summary: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    totalTokens: number;
    thisMonthJobs: number;
  };
  byType: { type: string; count: number }[];
  daily: { date: string; count: number }[];
  topProjects: { id: string; name: string; count: number }[];
  topMembers: { userId: string; name: string | null; email: string; count: number }[];
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value.toLocaleString()}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function HBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max === 0 ? 0 : Math.round((count / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 truncate text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-xs font-medium">{count}</span>
    </div>
  );
}

function DailyChart({ daily }: { daily: { date: string; count: number }[] }) {
  const max = Math.max(...daily.map((d) => d.count), 1);
  // 7일 간격 레이블만 표시
  const labelIndices = new Set([0, 6, 13, 20, 27, 29]);

  return (
    <div className="flex h-28 items-end gap-px">
      {daily.map((d, i) => {
        const h = Math.round((d.count / max) * 100);
        return (
          <div key={d.date} className="group relative flex flex-1 flex-col items-center justify-end">
            <div
              className="w-full rounded-t-sm bg-primary/70 transition-all group-hover:bg-primary"
              style={{ height: `${Math.max(h, d.count > 0 ? 4 : 0)}%` }}
            />
            {labelIndices.has(i) && (
              <span className="mt-1 text-[9px] text-muted-foreground">
                {d.date.slice(5)}
              </span>
            )}
            {/* 툴팁 */}
            <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background opacity-0 group-hover:opacity-100">
              {d.date}: {d.count}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const { data, isLoading: loading, error } = useSWR<AnalyticsData>(SWR_KEYS.analytics, {
    dedupingInterval: 60_000,
  });

  useEffect(() => {
    if (error) toast.error("분석 데이터를 불러오지 못했습니다.");
  }, [error]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  const { summary, byType, daily, topProjects, topMembers } = data;
  const successRate =
    summary.completedJobs + summary.failedJobs > 0
      ? Math.round((summary.completedJobs / (summary.completedJobs + summary.failedJobs)) * 100)
      : 100;

  const maxByType = Math.max(...byType.map((t) => t.count), 1);
  const maxProject = Math.max(...topProjects.map((p) => p.count), 1);
  const maxMember = Math.max(...topMembers.map((m) => m.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">분석</h2>
        <p className="text-muted-foreground">최근 30일 기준</p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="이번 달 생성" value={summary.thisMonthJobs} />
        <StatCard label="30일 총 생성" value={summary.totalJobs} />
        <StatCard label="성공률" value={`${successRate}%`} sub={`${summary.completedJobs} / ${summary.completedJobs + summary.failedJobs}`} />
        <StatCard label="실패" value={summary.failedJobs} />
        <StatCard label="총 토큰" value={summary.totalTokens.toLocaleString()} />
      </div>

      {/* 일별 추이 */}
      <Card>
        <CardContent className="pt-4">
          <p className="mb-3 text-sm font-semibold">일별 생성 수 (최근 30일)</p>
          <DailyChart daily={daily} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {/* 타입별 */}
        <Card>
          <CardContent className="space-y-3 pt-4">
            <p className="text-sm font-semibold">타입별 생성</p>
            {byType.length === 0 ? (
              <p className="text-xs text-muted-foreground">데이터 없음</p>
            ) : (
              byType.map((t) => (
                <HBar
                  key={t.type}
                  label={JOB_TYPE_LABEL[t.type] ?? t.type}
                  count={t.count}
                  max={maxByType}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* 프로젝트별 */}
        <Card>
          <CardContent className="space-y-3 pt-4">
            <p className="text-sm font-semibold">프로젝트별 생성 (상위 5)</p>
            {topProjects.length === 0 ? (
              <p className="text-xs text-muted-foreground">데이터 없음</p>
            ) : (
              topProjects.map((p) => (
                <HBar key={p.id} label={p.name} count={p.count} max={maxProject} />
              ))
            )}
          </CardContent>
        </Card>

        {/* 멤버별 */}
        <Card>
          <CardContent className="space-y-3 pt-4">
            <p className="text-sm font-semibold">멤버별 생성 (상위 5)</p>
            {topMembers.length === 0 ? (
              <p className="text-xs text-muted-foreground">데이터 없음</p>
            ) : (
              topMembers.map((m) => (
                <HBar
                  key={m.userId}
                  label={m.name ?? m.email}
                  count={m.count}
                  max={maxMember}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
