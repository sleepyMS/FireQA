"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { JobStatus } from "@/types/enums";
import { useLocale } from "@/lib/i18n/locale-provider";

interface JobStatusDisplayProps {
  status: string;
  error?: string | null;
  loadingMessage?: string;
}

export function JobStatusDisplay({
  status,
  error,
  loadingMessage,
}: JobStatusDisplayProps) {
  const router = useRouter();
  const { t } = useLocale();

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
          <p>{loadingMessage ?? t.common.loading}</p>
          <p className="mt-2 text-xs text-muted-foreground/60">
            {t.jobStatus.autoShowResult}
          </p>
        </div>
      </div>
    );
  }

  if (status === JobStatus.FAILED) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
        <p className="font-medium">{t.jobStatus.generationFailed}</p>
        {error && <p className="mt-2 text-sm">{error}</p>}
      </div>
    );
  }

  return null;
}
