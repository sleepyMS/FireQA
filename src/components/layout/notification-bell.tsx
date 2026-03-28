"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // 드롭다운이 열려있는 동안 폴링 카운트가 낙관적 업데이트를 덮어쓰는 race를 방지
  const isOpenRef = useRef(false);

  async function fetchCount() {
    if (isOpenRef.current) return;
    try {
      const res = await fetch("/api/notifications/count");
      if (res.ok) {
        const data = await res.json() as { count: number };
        setUnreadCount((prev) => (prev === data.count ? prev : data.count));
      }
    } catch {
      // 네트워크 오류 무시
    }
  }

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json() as { notifications: NotificationItem[]; unreadCount: number };
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // 네트워크 오류 무시
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    try {
      await fetch("/api/notifications/read", { method: "PATCH" });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // 네트워크 오류 무시
    }
  }

  // 마운트 시 카운트 조회 + 30초 폴링
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  // 드롭다운 열릴 때 알림 목록 조회
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // 외부 클릭 시 닫기
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
        aria-label="알림"
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
          {/* 헤더 */}
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-semibold">알림</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                모두 읽음
              </button>
            )}
          </div>

          {/* 내용 */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-muted-foreground">불러오는 중...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-muted-foreground">새로운 알림이 없습니다</span>
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
                        <Link
                          href={n.linkUrl}
                          onClick={() => setIsOpen(false)}
                          className="block"
                        >
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
