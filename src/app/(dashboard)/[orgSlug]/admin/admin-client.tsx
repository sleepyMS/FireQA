"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  FolderOpen,
  Users,
  Zap,
  Coins,
  MoreHorizontal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { TabNav } from "@/components/ui/tab-nav";
import { ROLE_LABEL, UserRole } from "@/types/enums";
import { SWR_KEYS } from "@/lib/swr/keys";
import { getAvatarColor } from "@/lib/avatar-colors";
import { relativeTime } from "@/lib/date/relative-time";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type TabKey = "overview" | "members";

interface AdminStats {
  projectCount: number;
  memberCount: number;
  monthlyJobCount: number;
  creditBalance: number;
  monthlyQuota: number;
}

interface AdminMember {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
  lastActiveAt: string | null;
  jobCount: number;
}

interface AdminMembersResponse {
  members: AdminMember[];
  total: number;
  page: number;
  size: number;
}

interface ActivityLog {
  id: string;
  action: string;
  actorId: string | null;
  projectId: string | null;
  metadata: string;
  createdAt: string;
}

function RoleBadge({ role }: { role: string }) {
  const label = ROLE_LABEL[role] ?? role;
  if (role === UserRole.OWNER)
    return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{label}</Badge>;
  if (role === UserRole.ADMIN)
    return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">{label}</Badge>;
  return <Badge variant="secondary">{label}</Badge>;
}


// --- Overview Tab ---
function OverviewTab() {
  const { data: stats } = useSWR<AdminStats>(SWR_KEYS.adminStats, fetcher);
  const { data: activityData } = useSWR<{ logs: ActivityLog[] }>(
    "/api/activity?limit=10",
    fetcher,
  );

  const cards = [
    { label: "프로젝트", value: stats?.projectCount ?? "-", icon: FolderOpen, color: "text-blue-600 bg-blue-100" },
    { label: "멤버", value: stats?.memberCount ?? "-", icon: Users, color: "text-emerald-600 bg-emerald-100" },
    { label: "이번 달 생성", value: stats?.monthlyJobCount ?? "-", icon: Zap, color: "text-amber-600 bg-amber-100" },
    { label: "크레딧 잔액", value: stats ? `${stats.creditBalance.toLocaleString()}` : "-", icon: Coins, color: "text-purple-600 bg-purple-100" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className={`rounded-lg p-2.5 ${c.color}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">최근 활동</CardTitle>
        </CardHeader>
        <CardContent>
          {!activityData?.logs?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">최근 활동이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {activityData.logs.map((log) => {
                let meta: Record<string, string> = {};
                try { meta = JSON.parse(log.metadata); } catch { /* ignore */ }
                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm"
                  >
                    <span className="font-medium">{log.action}</span>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      {meta.projectName && <span>{meta.projectName}</span>}
                      <span>{relativeTime(log.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// --- Members Tab ---
function MembersTab() {
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), size: "20" });
  const { data, mutate } = useSWR<AdminMembersResponse>(
    SWR_KEYS.adminMembers(params.toString()),
    fetcher,
  );

  const [roleChangeTarget, setRoleChangeTarget] = useState<{
    member: AdminMember;
    newRole: string;
  } | null>(null);
  const [roleChanging, setRoleChanging] = useState(false);

  async function confirmRoleChange() {
    if (!roleChangeTarget) return;
    setRoleChanging(true);
    try {
      const res = await fetch(
        `/api/organization/members/${roleChangeTarget.member.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: roleChangeTarget.newRole }),
        },
      );
      if (res.ok) {
        toast.success("역할이 변경되었습니다.");
        mutate();
      } else {
        const err = await res.json();
        toast.error(err.error || "역할 변경에 실패했습니다.");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setRoleChanging(false);
      setRoleChangeTarget(null);
    }
  }

  const members = data?.members ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          멤버 <span className="text-sm font-normal text-muted-foreground">{total}명</span>
        </h3>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">멤버</th>
                <th className="px-4 py-3 font-medium">역할</th>
                <th className="px-4 py-3 font-medium">가입일</th>
                <th className="px-4 py-3 font-medium">최근 활동</th>
                <th className="px-4 py-3 font-medium text-right">생성 수</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${getAvatarColor(m.name)}`}
                      >
                        {m.name[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{m.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><RoleBadge role={m.role} /></td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(m.joinedAt).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {m.lastActiveAt ? relativeTime(m.lastActiveAt) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">{m.jobCount}</td>
                  <td className="px-4 py-3">
                    {m.role !== UserRole.OWNER && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm" className="shrink-0" />
                          }
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="bottom" align="end">
                          {m.role !== UserRole.ADMIN && (
                            <DropdownMenuItem
                              onClick={() => setRoleChangeTarget({ member: m, newRole: UserRole.ADMIN })}
                            >
                              관리자로 변경
                            </DropdownMenuItem>
                          )}
                          {m.role !== UserRole.MEMBER && (
                            <DropdownMenuItem
                              onClick={() => setRoleChangeTarget({ member: m, newRole: UserRole.MEMBER })}
                            >
                              멤버로 변경
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    멤버가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            이전
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </Button>
        </div>
      )}

      <Dialog
        open={!!roleChangeTarget}
        onOpenChange={(open) => !open && setRoleChangeTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>역할 변경</DialogTitle>
            <DialogDescription>
              &quot;{roleChangeTarget?.member.name}&quot;님의 역할을{" "}
              <strong>{ROLE_LABEL[roleChangeTarget?.newRole ?? ""] ?? roleChangeTarget?.newRole}</strong>
              (으)로 변경하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
            <Button onClick={confirmRoleChange} disabled={roleChanging}>
              {roleChanging ? "변경 중..." : "변경"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Main Admin Client ---
export function AdminClient({ orgSlug }: { orgSlug: string }) {
  const [tab, setTab] = useState<TabKey>("overview");

  const tabs: { value: TabKey; label: string }[] = [
    { value: "overview", label: "개요" },
    { value: "members", label: "멤버 관리" },
  ];

  return (
    <>
      <TabNav tabs={tabs} value={tab} onValueChange={setTab} />
      {tab === "overview" ? <OverviewTab /> : <MembersTab />}
    </>
  );
}
