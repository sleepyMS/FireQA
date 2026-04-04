"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  FlaskConical,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/locale-provider";

export function BottomNav() {
  const pathname = usePathname();
  const params = useParams<{ orgSlug?: string }>();
  const orgSlug = params.orgSlug ?? "";
  const { t } = useLocale();

  const items = [
    { label: t.nav.dashboard, href: `/${orgSlug}/dashboard`, icon: LayoutDashboard },
    { label: t.nav.projects, href: `/${orgSlug}/projects`, icon: FolderOpen },
    { label: "TC 생성", href: `/${orgSlug}/generate`, icon: FileText },
    { label: t.nav.testRuns, href: `/${orgSlug}/test-runs`, icon: FlaskConical },
    { label: t.nav.settings, href: `/${orgSlug}/settings`, icon: Settings2 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="flex h-16 items-center justify-around">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
