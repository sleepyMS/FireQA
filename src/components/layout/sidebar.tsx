"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
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
import { OrgSwitcher } from "@/components/layout/org-switcher";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { Messages } from "@/lib/i18n/messages";
import { useUser } from "@/lib/auth/user-provider";

function buildNavItems(nav: Messages["nav"], orgSlug: string) {
  return [
    { label: nav.dashboard, href: `/${orgSlug}/dashboard`, icon: LayoutDashboard },
    { label: nav.projects, href: `/${orgSlug}/projects`, icon: FolderOpen },
    { label: nav.templates, href: `/${orgSlug}/templates`, icon: Settings },
    { label: nav.guide, href: `/${orgSlug}/guide`, icon: BookOpen },
    { label: nav.settings, href: `/${orgSlug}/settings`, icon: Settings2 },
  ];
}

function buildProjectNavItems(projectId: string, orgSlug: string) {
  return [
    { label: "개요", href: `/${orgSlug}/projects/${projectId}?tab=overview`, icon: LayoutDashboard },
    { label: "TC 자동 생성", href: `/${orgSlug}/generate?projectId=${projectId}`, icon: FileText },
    { label: "다이어그램", href: `/${orgSlug}/diagrams?projectId=${projectId}`, icon: GitBranch },
    { label: "와이어프레임", href: `/${orgSlug}/wireframes?projectId=${projectId}`, icon: Smartphone },
    { label: "기획서 개선", href: `/${orgSlug}/improve?projectId=${projectId}`, icon: FileEdit },
    { label: "생성 이력", href: `/${orgSlug}/history?projectId=${projectId}`, icon: Clock },
    { label: "활동 로그", href: `/${orgSlug}/activity?projectId=${projectId}`, icon: Activity },
    { label: "분석", href: `/${orgSlug}/analytics?projectId=${projectId}`, icon: BarChart2 },
    { label: "파일", href: `/${orgSlug}/projects/${projectId}?tab=uploads`, icon: FolderOpen },
  ];
}

function isProjectNavActive(
  item: { href: string; label: string },
  pathname: string,
  searchParams: URLSearchParams,
  projectId: string,
  orgSlug: string,
) {
  if (item.label === "개요") {
    return (
      pathname === `/${orgSlug}/projects/${projectId}` &&
      (!searchParams.get("tab") || searchParams.get("tab") === "overview")
    );
  }
  if (item.href.includes("/generate")) return pathname === `/${orgSlug}/generate`;
  if (item.href.includes("/diagrams")) return pathname === `/${orgSlug}/diagrams`;
  if (item.href.includes("/wireframes")) return pathname === `/${orgSlug}/wireframes`;
  if (item.href.includes("/improve")) return pathname === `/${orgSlug}/improve`;
  if (item.label === "생성 이력") return pathname === `/${orgSlug}/history`;
  if (item.label === "활동 로그") return pathname === `/${orgSlug}/activity`;
  if (item.label === "분석") return pathname === `/${orgSlug}/analytics`;
  if (item.label === "파일") {
    return (
      pathname === `/${orgSlug}/projects/${projectId}` &&
      searchParams.get("tab") === "uploads"
    );
  }
  return false;
}

interface SidebarProps {
  initialMemberships: { organizationId: string; name: string; slug: string; role: string }[];
  initialActiveOrgId: string | null;
}

export function Sidebar({ initialMemberships, initialActiveOrgId }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams<{ orgSlug?: string }>();
  const orgSlug = params.orgSlug ?? "";
  const [mobileOpen, setMobileOpen] = useState(false);
  const authUser = useUser();
  const { t } = useLocale();
  const navItems = buildNavItems(t.nav, orgSlug);

  // /{orgSlug}/projects/{id} 패턴에서 projectId 추출
  const projectMatch = pathname.match(/^\/[^/]+\/projects\/([^/?]+)/);
  const urlProjectId = projectMatch?.[1] ?? searchParams.get("projectId");

  const [lastProjectId, setLastProjectId] = useState<string | null>(null);
  useEffect(() => {
    if (urlProjectId) setLastProjectId(urlProjectId);
  }, [urlProjectId]);

  const currentProjectId = urlProjectId ?? lastProjectId;
  const projectNavItems = currentProjectId ? buildProjectNavItems(currentProjectId, orgSlug) : [];

  const navContent = (
    <>
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Flame className="h-6 w-6 text-orange-500" />
          <span className="text-lg font-bold">FireQA</span>
        </div>
        <button className="lg:hidden" onClick={() => setMobileOpen(false)}>
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="border-b px-2 py-2">
        <OrgSwitcher
          initialMemberships={initialMemberships}
          initialActiveOrgId={initialActiveOrgId}
        />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" &&
              pathname.startsWith(item.href) &&
              !item.href.endsWith("/projects"));
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

        {currentProjectId && (
          <>
            <div className="my-3 border-t pt-3">
              <p className="mb-1 px-3 text-xs font-medium text-muted-foreground/70">
                현재 프로젝트
              </p>
            </div>
            {projectNavItems.map((item) => {
              const isActive = isProjectNavActive(
                item, pathname, searchParams, currentProjectId, orgSlug
              );
              return (
                <Link
                  key={item.label}
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
          </>
        )}
      </nav>

      <div className="border-t p-4">
        {authUser && (
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
              {authUser.name?.charAt(0).toUpperCase() ?? authUser.email.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              {authUser.name && (
                <p className="truncate text-sm font-medium leading-tight">{authUser.name}</p>
              )}
              <p className="truncate text-xs text-muted-foreground">{authUser.email}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      <button
        className="fixed left-4 top-3 z-50 rounded-md p-2 lg:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r bg-card transition-transform lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </aside>

      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-60 lg:flex-col lg:border-r lg:bg-card">
        {navContent}
      </aside>
    </>
  );
}
