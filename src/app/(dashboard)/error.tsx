"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/locale-provider";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
      <h2 className="mb-2 text-lg font-semibold">{t.errors.title}</h2>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        {error.message || t.errors.unknownError}
      </p>
      <Button onClick={reset}>{t.errors.retry}</Button>
    </div>
  );
}
