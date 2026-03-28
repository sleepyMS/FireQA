"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, History, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ResultVersionInfo {
  id: string;
  version: number;
  changeType: string;
  changeSummary: string | null;
  instruction: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: { name: string | null; email: string } | null;
}

const CHANGE_TYPE_LABEL: Record<string, string> = {
  initial: "초기 생성",
  "ai-improve": "AI 개선",
  "ai-fix": "AI 수정",
  "manual-edit": "수동 편집",
  revert: "이전 버전 복원",
};

interface VersionBarProps {
  jobId: string;
  onVersionChange?: (resultJson: string, versionId: string) => void;
}

export function VersionBar({ jobId, onVersionChange }: VersionBarProps) {
  const [versions, setVersions] = useState<ResultVersionInfo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    fetch(`/api/versions?jobId=${encodeURIComponent(jobId)}`)
      .then((r) => r.json())
      .then((data) => {
        const vs: ResultVersionInfo[] = data.versions || [];
        setVersions(vs);
        // 활성 버전부터 시작
        const activeIdx = vs.findIndex((v) => v.isActive);
        setCurrentIndex(activeIdx >= 0 ? activeIdx : vs.length - 1);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [jobId]);

  // 버전이 1개 이하면 바 표시 안 함
  if (loading || versions.length <= 1) return null;

  const current = versions[currentIndex];
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < versions.length - 1;

  async function activateVersion(version: ResultVersionInfo) {
    setActivating(true);
    try {
      const r = await fetch(`/api/versions/${version.id}/activate`, {
        method: "PATCH",
      });
      if (!r.ok) throw new Error();
      // onVersionChange 콜백이 없으면 페이지 리로드로 서버 컴포넌트 재렌더링
      if (onVersionChange) {
        const vData = await fetch(
          `/api/versions?jobId=${encodeURIComponent(jobId)}`
        ).then((res) => res.json());
        const fullVersion = (
          vData.versions as (ResultVersionInfo & { resultJson?: string })[]
        )?.find((v) => v.id === version.id);
        if (fullVersion?.resultJson) {
          onVersionChange(fullVersion.resultJson, version.id);
          return;
        }
      }
      window.location.reload();
    } catch {
      toast.error("버전 복원에 실패했습니다.");
    } finally {
      setActivating(false);
    }
  }

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          버전 {currentIndex + 1} / {versions.length}
        </span>
        {current && (
          <Badge variant="secondary" className="text-xs">
            {CHANGE_TYPE_LABEL[current.changeType] ?? current.changeType}
          </Badge>
        )}
        {current?.changeSummary && (
          <span className="text-xs text-muted-foreground">
            — {current.changeSummary}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={!canPrev}
          onClick={() => setCurrentIndex((i) => i - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* 버전 도트 */}
        <div className="flex items-center gap-1 px-1">
          {versions.map((v, i) => (
            <button
              key={v.id}
              onClick={() => setCurrentIndex(i)}
              className={`h-2.5 w-2.5 rounded-full transition-all ${
                i === currentIndex
                  ? "scale-125 bg-primary"
                  : v.isActive
                    ? "bg-green-500"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              title={`v${v.version}: ${CHANGE_TYPE_LABEL[v.changeType] ?? v.changeType}${v.isActive ? " (현재)" : ""}`}
            />
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          disabled={!canNext}
          onClick={() => setCurrentIndex((i) => i + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {current && !current.isActive && (
          <Button
            variant="outline"
            size="sm"
            className="ml-2 text-xs"
            disabled={activating}
            onClick={() => activateVersion(current)}
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            이 버전으로 복원
          </Button>
        )}
        {current?.isActive && (
          <Badge className="ml-2 bg-green-600 text-xs">현재 버전</Badge>
        )}
      </div>
    </div>
  );
}
