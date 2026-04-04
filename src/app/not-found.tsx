"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center">
        <FileQuestion className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
        <p className="mb-2 text-7xl font-bold tracking-tight text-foreground">
          404
        </p>
        <h1 className="mb-2 text-2xl font-semibold text-foreground">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="mb-8 max-w-md text-muted-foreground">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>

        <div className="flex justify-center gap-3">
          <Link
            href="/"
            className={buttonVariants({ size: "lg", className: "gap-2" })}
          >
            <Home className="h-4 w-4" />
            홈으로 돌아가기
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
