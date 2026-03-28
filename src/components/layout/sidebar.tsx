"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  GitBranch,
  Smartphone,
  FileEdit,
  Clock,
  Settings,
  Settings2,
  Flame,
  Menu,
  X,
  BookOpen,
  Activity,
  BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { OrgSwitcher } from "@/components/layout/org-switcher";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { Messages } from "@/lib/i18n/messages";

function buildNavItems(nav: Messages["nav"]) {
  return [
    { label: nav.dashboard, href: "/dashboard", icon: LayoutDashboard },
    { label: nav.projects, href: "/projects", icon: FolderOpen },
    { label: nav.generate, href: "/generate", icon: FileText },
    { label: nav.diagrams, href: "/diagrams", icon: GitBranch },
    { label: nav.wireframes, href: "/wireframes", icon: Smartphone },
    { label: nav.improve, href: "/improve", icon: FileEdit },
    { label: nav.history, href: "/history", icon: Clock },
    { label: nav.activity, href: "/activity", icon: Activity },
    { label: nav.analytics, href: "/analytics", icon: BarChart2 },
    { label: nav.templates, href: "/templates", icon: Settings },
    { label: nav.guide, href: "/guide", icon: BookOpen },
    { label: nav.settings, href: "/settings", icon: Settings2 },
  ];
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const { t } = useLocale();
  const navItems = buildNavItems(t.nav);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const navContent = (
    <>
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Flame className="h-6 w-6 text-orange-500" />
          <span className="text-lg font-bold">FireQA</span>
        </div>
        <button
          className="lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="border-b px-2 py-2">
        <OrgSwitcher />
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        {user && (
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
              {(user.user_metadata?.full_name as string | undefined)
                ?.charAt(0)
                ?.toUpperCase() ??
                user.email?.charAt(0).toUpperCase() ??
                "?"}
            </div>
            <div className="min-w-0">
              {user.user_metadata?.full_name && (
                <p className="truncate text-sm font-medium leading-tight">
                  {user.user_metadata.full_name as string}
                </p>
              )}
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="fixed left-4 top-3 z-50 rounded-md p-2 lg:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r bg-card transition-transform lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-60 lg:flex-col lg:border-r lg:bg-card">
        {navContent}
      </aside>
    </>
  );
}
