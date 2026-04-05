"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { Search, UserCog } from "lucide-react";
import { NotificationBell } from "@/components/layout/notification-bell";
import { SearchDialog } from "@/components/layout/search-dialog";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { Messages } from "@/lib/i18n/messages";

function buildPageTitles(nav: Messages["nav"]): Record<string, string> {
  return {
    "/dashboard": nav.dashboard,
    "/generate": nav.generate,
    "/diagrams": nav.diagrams,
    "/wireframes": nav.wireframes,
    "/improve": nav.improve,
    "/history": nav.history,
    "/activity": nav.activity,
    "/analytics": nav.analytics,
    "/templates": nav.templates,
    "/guide": nav.guide,
    "/settings": nav.settings,
  };
}

export function Header({ initialNotificationCount, orgName }: { initialNotificationCount?: number; orgName?: string }) {
  const pathname = usePathname();
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  const { t } = useLocale();
  const pageTitles = buildPageTitles(t.nav);

  const title =
    pageTitles[pathname] ??
    Object.entries(pageTitles).find(
      ([path]) => path !== "/" && pathname.startsWith(path)
    )?.[1] ??
    "FireQA";

  return (
    <>
      <SearchDialog />
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/95 pl-14 pr-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
        <div className="flex flex-col gap-0">
          <h1 className="text-base font-semibold leading-tight">{title}</h1>
          {orgName && (
            <span className="text-xs text-muted-foreground">{orgName}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
            className="hidden items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors sm:flex"
          >
            <Search className="h-3.5 w-3.5" />
            <span>{t.common.search}</span>
            <kbd className="ml-1 rounded border px-1 py-0.5 text-[10px]">⌘K</kbd>
          </button>
          <NotificationBell initialCount={initialNotificationCount} />
          {orgSlug && (
            <Link
              href={`/${orgSlug}/account`}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="계정 설정"
            >
              <UserCog className="h-5 w-5" />
            </Link>
          )}
        </div>
      </header>
    </>
  );
}
