"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/locale-provider";

export default function NotFound() {
  const router = useRouter();
  const { t } = useLocale();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center">
        <FileQuestion className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
        <p className="mb-2 text-7xl font-bold tracking-tight text-foreground">
          404
        </p>
        <h1 className="mb-2 text-2xl font-semibold text-foreground">
          {t.errors.notFound}
        </h1>
        <p className="mb-8 max-w-md text-muted-foreground">
          {t.errors.notFoundDescription}
        </p>

        <div className="flex justify-center gap-3">
          <Link
            href="/"
            className={buttonVariants({ size: "lg", className: "gap-2" })}
          >
            <Home className="h-4 w-4" />
            {t.errors.goHome}
          </Link>
          <Button
            variant="outline"
            size="lg"
            className="gap-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            이전 페이지로
          </Button>
        </div>
      </div>
    </div>
  );
}
