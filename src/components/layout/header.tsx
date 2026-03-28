"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogOut, Search } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { NotificationBell } from "@/components/layout/notification-bell";
import { SearchDialog } from "@/components/layout/search-dialog";

const pageTitles: Record<string, string> = {
  "/dashboard": "대시보드",
  "/generate": "TC 생성",
  "/diagrams": "다이어그램",
  "/wireframes": "와이어프레임",
  "/improve": "기획서 개선",
  "/history": "이력",
  "/templates": "템플릿",
  "/guide": "사용법",
  "/settings": "설정",
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
    <>
      <SearchDialog />
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <h1 className="text-lg font-semibold">{title}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
            className="hidden items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors sm:flex"
          >
            <Search className="h-3.5 w-3.5" />
            <span>검색</span>
            <kbd className="ml-1 rounded border px-1 py-0.5 text-[10px]">⌘K</kbd>
          </button>
          <NotificationBell />
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </div>
      </header>
    </>
  );
}
