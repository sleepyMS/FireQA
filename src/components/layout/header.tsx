"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard": "대시보드",
  "/generate": "TC 생성",
  "/diagrams": "다이어그램",
  "/wireframes": "와이어프레임",
  "/history": "이력",
  "/templates": "템플릿",
  "/guide": "사용법",
};

export function Header() {
  const pathname = usePathname();

  const title =
    pageTitles[pathname] ??
    Object.entries(pageTitles).find(
      ([path]) => path !== "/" && pathname.startsWith(path)
    )?.[1] ??
    "FireQA";

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}
