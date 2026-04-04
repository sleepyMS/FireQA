"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { JobStatus } from "@/types/enums";

interface JobStatusDisplayProps {
  status: string;
  error?: string | null;
  loadingMessage?: string;
}

export function JobStatusDisplay({
  status,
  error,
  loadingMessage = "생성하고 있습니다...",
}: JobStatusDisplayProps) {
  const router = useRouter();

  // PROCESSING 상태일 때 적응형 간격 자동 새로고침
  // 초기 5초 → 최대 15초까지 점진적 증가 (사용자가 직접 URL로 접근했을 때를 위한 폴백)
  useEffect(() => {
    if (status !== JobStatus.PROCESSING) return;

    let delay = 5_000;
    const MAX_DELAY = 15_000;
    let timer: ReturnType<typeof setTimeout>;

    function tick() {
      router.refresh();
      delay = Math.min(delay + 2_000, MAX_DELAY);
      timer = setTimeout(tick, delay);
    }
    timer = setTimeout(tick, delay);

    return () => clearTimeout(timer);
  }, [status, router]);

  if (status === JobStatus.PROCESSING) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p>{loadingMessage}</p>
          <p className="mt-2 text-xs text-muted-foreground/60">
            완료되면 자동으로 결과가 표시됩니다
          </p>
        </div>
      </div>
    );
  }

  if (status === JobStatus.FAILED) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
        <p className="font-medium">생성에 실패했습니다.</p>
        {error && <p className="mt-2 text-sm">{error}</p>}
      </div>
    );
  }

  return null;
}
