"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/locale-provider";

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const { t } = useLocale();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
      <h2 className="mb-2 text-lg font-semibold text-foreground">
        {t.errors.title}
      </h2>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        {error.message || t.errors.unknownError}
      </p>
      <Button onClick={() => unstable_retry()} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        {t.errors.retry}
      </Button>
    </div>
  );
}
