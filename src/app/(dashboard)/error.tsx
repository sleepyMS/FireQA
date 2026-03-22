"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
      <h2 className="mb-2 text-lg font-semibold">오류가 발생했습니다</h2>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        {error.message || "알 수 없는 오류가 발생했습니다."}
      </p>
      <Button onClick={reset}>다시 시도</Button>
    </div>
  );
}
