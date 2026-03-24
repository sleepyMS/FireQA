"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
  const router = useRouter();

  const title =
    pageTitles[pathname] ??
    Object.entries(pageTitles).find(
      ([path]) => path !== "/" && pathname.startsWith(path)
    )?.[1] ??
    "FireQA";

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <h1 className="text-lg font-semibold">{title}</h1>
      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <LogOut className="h-4 w-4" />
        로그아웃
      </button>
    </header>
  );
}
