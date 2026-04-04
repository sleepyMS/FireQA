"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function RootError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center">
        <AlertCircle className="mx-auto mb-4 h-16 w-16 text-destructive" />
        <h1 className="mb-2 text-3xl font-bold text-foreground">
          오류가 발생했습니다
        </h1>
        <p className="mb-6 max-w-md text-lg text-muted-foreground">
          서비스 이용 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.
        </p>

        {process.env.NODE_ENV === "development" && (
          <details className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-left dark:bg-destructive/10">
            <summary className="cursor-pointer font-mono text-sm text-destructive">
              상세 정보
            </summary>
            <pre className="mt-2 overflow-auto text-xs text-muted-foreground">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}

        <div className="flex justify-center gap-3">
          <Button onClick={() => unstable_retry()} size="lg" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            다시 시도
          </Button>
          <Link
            href="/"
            className={buttonVariants({ variant: "outline", size: "lg", className: "gap-2" })}
          >
            <Home className="h-4 w-4" />
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
