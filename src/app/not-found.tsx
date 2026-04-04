"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/locale-provider";

export default function NotFound() {
  const { t } = useLocale();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center">
      <h1 className="mb-2 text-4xl font-bold">404</h1>
      <h2 className="mb-4 text-xl font-semibold">{t.errors.notFound}</h2>
      <p className="mb-8 max-w-md text-sm text-muted-foreground">
        {t.errors.notFoundDescription}
      </p>
      <Button render={<Link href="/" />}>{t.errors.goHome}</Button>
    </div>
  );
}
