"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import useSWR, { useSWRConfig } from "swr";
import { SWR_KEYS } from "@/lib/swr/keys";
import { relativeTime } from "@/lib/date/relative-time";
import { useLocale } from "@/lib/i18n/locale-provider";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell({ initialCount }: { initialCount?: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(false);
  const { mutate } = useSWRConfig();
  const { t } = useLocale();

  const { data: countData } = useSWR<{ count: number }>(SWR_KEYS.notificationCount, {
    refreshInterval: 30_000,
    isPaused: () => isOpenRef.current,
    ...(initialCount !== undefined ? { fallbackData: { count: initialCount } } : {}),
  });
  const unreadCount = countData?.count ?? 0;

  // Fetch notification list only when dropdown is open
  const { data: notifData, isLoading: loading } = useSWR<{
    notifications: NotificationItem[];
    unreadCount: number;
  }>(isOpen ? SWR_KEYS.notifications : null);
  const notifications = notifData?.notifications ?? [];

  async function markAllRead() {
    try {
      await fetch("/api/notifications/read", { method: "PATCH" });
      mutate(SWR_KEYS.notificationCount, { count: 0 }, { revalidate: false });
      mutate(
        SWR_KEYS.notifications,
        (prev: { notifications: NotificationItem[]; unreadCount: number } | undefined) =>
          prev
            ? { ...prev, unreadCount: 0, notifications: prev.notifications.map((n) => ({ ...n, isRead: true })) }
            : prev,
        { revalidate: false }
      );
    } catch {
      // silently ignore network errors
    }
  }

  // Realtime subscription — revalidate SWR on INSERT to update badge immediately
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id;
      if (!userId) return;

      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          "postgres_changes" as any,
          { event: "INSERT", schema: "public", table: "Notification" },
          (payload: { new: Record<string, unknown> }) => {
            if (payload.new?.userId !== userId) return;
            mutate(SWR_KEYS.notificationCount);
            if (isOpenRef.current) mutate(SWR_KEYS.notifications);
          }
        )
        .subscribe();
    });

    return () => { if (channel) supabase.removeChannel(channel); };
  }, [mutate]);

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        isOpenRef.current = false;
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((prev) => { isOpenRef.current = !prev; return !prev; })}
        className="relative flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label={t.teams.notifications}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border bg-background shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-semibold">{t.teams.notifications}</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {t.teams.markAllRead}
              </button>
            )}
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-muted-foreground">{t.teams.notificationsLoading}</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-muted-foreground">{t.teams.noNotifications}</span>
              </div>
            ) : (
              <ul>
                {notifications.map((n) => {
                  const content = (
                    <div className={`flex items-start gap-3 px-4 py-3 ${!n.isRead ? "bg-muted/40" : ""}`}>
                      {!n.isRead && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      )}
                      <div className={`flex min-w-0 flex-1 flex-col gap-0.5 ${n.isRead ? "pl-5" : ""}`}>
                        <span className="text-sm">{n.title}</span>
                        <span className="text-xs text-muted-foreground">{relativeTime(n.createdAt)}</span>
                      </div>
                    </div>
                  );

                  return (
                    <li key={n.id} className="border-b last:border-b-0 hover:bg-muted/60 transition-colors">
                      {n.linkUrl ? (
                        <Link href={n.linkUrl} onClick={() => setIsOpen(false)} className="block">
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
