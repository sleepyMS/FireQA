"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TestCase, TestSheet } from "@/types/test-case";

// ─── 타입 ───

interface VersionInfo {
  id: string;
  version: number;
  changeType: string;
  changeSummary: string | null;
  isActive: boolean;
  createdAt: string;
}

interface CompareResult {
  source: {
    id: string;
    version: number;
    changeType: string;
    changeSummary: string | null;
    resultJson: string;
    createdAt: string;
  };
  target: {
    id: string;
    version: number;
    changeType: string;
    changeSummary: string | null;
    resultJson: string;
    createdAt: string;
  };
}

type DiffStatus = "unchanged" | "added" | "removed" | "modified";

interface DiffRow {
  status: DiffStatus;
  source: TestCase | null;
  target: TestCase | null;
}

interface SheetDiff {
  sheetName: string;
  rows: DiffRow[];
  stats: { added: number; removed: number; modified: number; unchanged: number };
}

const CHANGE_TYPE_LABEL: Record<string, string> = {
  initial: "초기 생성",
  "ai-improve": "AI 개선",
  "ai-fix": "AI 수정",
  "manual-edit": "수동 편집",
  revert: "복원",
};

const STATUS_COLORS: Record<DiffStatus, string> = {
  unchanged: "",
  added: "bg-green-50 dark:bg-green-950/30",
  removed: "bg-red-50 dark:bg-red-950/30",
  modified: "bg-yellow-50 dark:bg-yellow-950/30",
};

const STATUS_BADGE: Record<DiffStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  unchanged: { label: "동일", variant: "secondary" },
  added: { label: "추가", variant: "default" },
  removed: { label: "삭제", variant: "destructive" },
  modified: { label: "변경", variant: "outline" },
};

// ─── Diff 로직 ───

function diffTestSheets(sourceSheets: TestSheet[], targetSheets: TestSheet[]): SheetDiff[] {
  const allSheetNames = new Set([
    ...sourceSheets.map((s) => s.sheetName),
    ...targetSheets.map((s) => s.sheetName),
  ]);

  const result: SheetDiff[] = [];
  for (const sheetName of allSheetNames) {
    const sourceTCs = sourceSheets.find((s) => s.sheetName === sheetName)?.testCases ?? [];
    const targetTCs = targetSheets.find((s) => s.sheetName === sheetName)?.testCases ?? [];

    const rows = diffTestCases(sourceTCs, targetTCs);
    const stats = {
      added: rows.filter((r) => r.status === "added").length,
      removed: rows.filter((r) => r.status === "removed").length,
      modified: rows.filter((r) => r.status === "modified").length,
      unchanged: rows.filter((r) => r.status === "unchanged").length,
    };

    result.push({ sheetName, rows, stats });
  }

  return result;
}

function diffTestCases(source: TestCase[], target: TestCase[]): DiffRow[] {
  const sourceMap = new Map(source.map((tc) => [tc.tcId, tc]));
  const targetMap = new Map(target.map((tc) => [tc.tcId, tc]));
  const allIds = new Set([...sourceMap.keys(), ...targetMap.keys()]);

  const rows: DiffRow[] = [];
  for (const id of allIds) {
    const s = sourceMap.get(id) ?? null;
    const t = targetMap.get(id) ?? null;

    if (s && !t) {
      rows.push({ status: "removed", source: s, target: null });
    } else if (!s && t) {
      rows.push({ status: "added", source: null, target: t });
    } else if (s && t) {
      const changed = isTestCaseChanged(s, t);
      rows.push({ status: changed ? "modified" : "unchanged", source: s, target: t });
    }
  }

  return rows;
}

function isTestCaseChanged(a: TestCase, b: TestCase): boolean {
  const fields: (keyof TestCase)[] = [
    "name", "depth1", "depth2", "depth3", "precondition", "procedure", "expectedResult",
  ];
  return fields.some((f) => a[f] !== b[f]);
}

// ─── 메인 컴포넌트 ───

interface VersionCompareDialogProps {
  versions: VersionInfo[];
  currentVersionId?: string;
}

export function VersionCompareDialog({
  versions,
  currentVersionId,
}: VersionCompareDialogProps) {
  const [open, setOpen] = useState(false);
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [loading, setLoading] = useState(false);
  const [compareData, setCompareData] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 초기 선택: 현재 활성 버전과 바로 이전 버전
  useEffect(() => {
    if (!open || versions.length < 2) return;

    const activeIdx = versions.findIndex((v) => v.id === currentVersionId);
    const active = activeIdx >= 0 ? activeIdx : versions.length - 1;
    const prev = Math.max(0, active - 1);

    if (active !== prev) {
      setSourceId(versions[prev].id);
      setTargetId(versions[active].id);
    } else {
      setSourceId(versions[0].id);
      setTargetId(versions[versions.length - 1].id);
    }

    setCompareData(null);
    setError(null);
  }, [open, versions, currentVersionId]);

  const fetchCompare = useCallback(async () => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/versions/${encodeURIComponent(sourceId)}/compare?targetId=${encodeURIComponent(targetId)}`,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "비교 데이터를 불러올 수 없습니다.");
      }
      const data: CompareResult = await res.json();
      setCompareData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [sourceId, targetId]);

  // 버전 선택 변경 시 자동 비교
  useEffect(() => {
    if (open && sourceId && targetId && sourceId !== targetId) {
      fetchCompare();
    }
  }, [open, sourceId, targetId, fetchCompare]);

  const sheetDiffs = useMemo(() => {
    if (!compareData) return [];
    try {
      const sourceResult = JSON.parse(compareData.source.resultJson);
      const targetResult = JSON.parse(compareData.target.resultJson);
      const sourceSheets: TestSheet[] = sourceResult.sheets ?? [];
      const targetSheets: TestSheet[] = targetResult.sheets ?? [];
      return diffTestSheets(sourceSheets, targetSheets);
    } catch {
      return [];
    }
  }, [compareData]);

  const totalStats = useMemo(() => {
    return sheetDiffs.reduce(
      (acc, d) => ({
        added: acc.added + d.stats.added,
        removed: acc.removed + d.stats.removed,
        modified: acc.modified + d.stats.modified,
        unchanged: acc.unchanged + d.stats.unchanged,
      }),
      { added: 0, removed: 0, modified: 0, unchanged: 0 },
    );
  }, [sheetDiffs]);

  if (versions.length < 2) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="text-xs">
            <ArrowRightLeft className="mr-1 h-3.5 w-3.5" />
            버전 비교
          </Button>
        }
      />
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>버전 비교</DialogTitle>
        </DialogHeader>

        {/* 버전 선택 */}
        <div className="flex items-center gap-3 border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">기준:</span>
            <select
              className="h-8 rounded-md border bg-transparent px-2 text-sm"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id} disabled={v.id === targetId}>
                  v{v.version} — {CHANGE_TYPE_LABEL[v.changeType] ?? v.changeType}
                  {v.isActive ? " (현재)" : ""}
                </option>
              ))}
            </select>
          </div>

          <ArrowRightLeft className="h-4 w-4 text-muted-foreground shrink-0" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">비교:</span>
            <select
              className="h-8 rounded-md border bg-transparent px-2 text-sm"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id} disabled={v.id === sourceId}>
                  v{v.version} — {CHANGE_TYPE_LABEL[v.changeType] ?? v.changeType}
                  {v.isActive ? " (현재)" : ""}
                </option>
              ))}
            </select>
          </div>

          {sourceId === targetId && (
            <span className="text-xs text-amber-600">같은 버전은 비교할 수 없습니다.</span>
          )}
        </div>

        {/* 결과 영역 */}
        <ScrollArea className="flex-1 min-h-0">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">비교 중...</span>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && compareData && (
            <div className="space-y-4">
              {/* 요약 통계 */}
              <div className="flex items-center gap-2">
                {totalStats.added > 0 && (
                  <Badge className="bg-green-600 text-xs">+{totalStats.added} 추가</Badge>
                )}
                {totalStats.removed > 0 && (
                  <Badge variant="destructive" className="text-xs">-{totalStats.removed} 삭제</Badge>
                )}
                {totalStats.modified > 0 && (
                  <Badge className="bg-yellow-600 text-xs">{totalStats.modified} 변경</Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  {totalStats.unchanged} 동일
                </Badge>
              </div>

              {/* 시트별 diff */}
              {sheetDiffs.map((sheetDiff) => (
                <SheetDiffView
                  key={sheetDiff.sheetName}
                  sheetDiff={sheetDiff}
                  sourceVersion={compareData.source.version}
                  targetVersion={compareData.target.version}
                />
              ))}

              {sheetDiffs.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  비교할 테스트케이스 데이터가 없습니다.
                </p>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── 시트 Diff 뷰 ───

function SheetDiffView({
  sheetDiff,
  sourceVersion,
  targetVersion,
}: {
  sheetDiff: SheetDiff;
  sourceVersion: number;
  targetVersion: number;
}) {
  const [showUnchanged, setShowUnchanged] = useState(false);
  const visibleRows = showUnchanged
    ? sheetDiff.rows
    : sheetDiff.rows.filter((r) => r.status !== "unchanged");

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{sheetDiff.sheetName}</span>
          {sheetDiff.stats.added > 0 && (
            <span className="text-xs text-green-600">+{sheetDiff.stats.added}</span>
          )}
          {sheetDiff.stats.removed > 0 && (
            <span className="text-xs text-red-600">-{sheetDiff.stats.removed}</span>
          )}
          {sheetDiff.stats.modified > 0 && (
            <span className="text-xs text-yellow-600">~{sheetDiff.stats.modified}</span>
          )}
        </div>
        {sheetDiff.stats.unchanged > 0 && (
          <button
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowUnchanged(!showUnchanged)}
          >
            {showUnchanged ? "변경된 항목만 보기" : `동일 항목 ${sheetDiff.stats.unchanged}개 표시`}
          </button>
        )}
      </div>

      {visibleRows.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">변경사항 없음</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-xs">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="w-[60px] px-2 py-1.5 text-left font-medium text-muted-foreground">상태</th>
                <th className="w-[70px] px-2 py-1.5 text-left font-medium text-muted-foreground">TC ID</th>
                <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                  v{sourceVersion} (기준)
                </th>
                <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                  v{targetVersion} (비교)
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, i) => (
                <DiffRowView key={row.source?.tcId ?? row.target?.tcId ?? i} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Diff 행 ───

function DiffRowView({ row }: { row: DiffRow }) {
  const { status, source, target } = row;
  const badgeInfo = STATUS_BADGE[status];
  const tcId = source?.tcId ?? target?.tcId ?? "";

  return (
    <tr className={`border-b last:border-b-0 ${STATUS_COLORS[status]}`}>
      <td className="px-2 py-1.5 align-top">
        <Badge variant={badgeInfo.variant} className="text-[10px]">
          {badgeInfo.label}
        </Badge>
      </td>
      <td className="px-2 py-1.5 align-top font-mono">{tcId}</td>
      <td className="px-2 py-1.5 align-top">
        {source ? <TCCellContent tc={source} other={target} side="source" status={status} /> : (
          <span className="text-muted-foreground italic">-</span>
        )}
      </td>
      <td className="px-2 py-1.5 align-top">
        {target ? <TCCellContent tc={target} other={source} side="target" status={status} /> : (
          <span className="text-muted-foreground italic">-</span>
        )}
      </td>
    </tr>
  );
}

// ─── TC 셀 내용 (필드별 차이 하이라이팅) ───

const DISPLAY_FIELDS: { key: keyof TestCase; label: string }[] = [
  { key: "name", label: "TC명" },
  { key: "depth1", label: "1Depth" },
  { key: "depth2", label: "2Depth" },
  { key: "depth3", label: "3Depth" },
  { key: "precondition", label: "사전조건" },
  { key: "procedure", label: "절차" },
  { key: "expectedResult", label: "기대결과" },
];

function TCCellContent({
  tc,
  other,
  status,
}: {
  tc: TestCase;
  other: TestCase | null;
  side: "source" | "target";
  status: DiffStatus;
}) {
  return (
    <div className="space-y-0.5">
      {DISPLAY_FIELDS.map(({ key, label }) => {
        const value = tc[key];
        const otherValue = other?.[key];
        const fieldChanged = status === "modified" && other && value !== otherValue;

        if (!value && !fieldChanged) return null;

        return (
          <div key={key} className="flex gap-1">
            <span className="shrink-0 text-muted-foreground">{label}:</span>
            <span
              className={
                fieldChanged
                  ? "rounded bg-yellow-200/60 px-0.5 dark:bg-yellow-800/40"
                  : ""
              }
            >
              {value || "-"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
