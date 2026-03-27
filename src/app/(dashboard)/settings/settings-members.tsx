"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Copy, Check, UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ROLE_LABEL, UserRole } from "@/types/enums";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import InviteDialog, { type CreatedInvitation } from "./invite-dialog";

// ─── 타입 ──────────────────────────────────────────────
interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface Invitation {
  id: string;
  email: string | null;
  role: string;
  expiresAt: string;
  token?: string; // 생성 직후에만 존재, 새로고침 시 사라짐
}

// ─── 아바타 색상 ────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-sky-500",
] as const;

function getAvatarColor(name: string): string {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

// ─── 역할 뱃지 ──────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const label = ROLE_LABEL[role] ?? role;
  if (role === UserRole.OWNER)
    return (
      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
        {label}
      </Badge>
    );
  if (role === UserRole.ADMIN)
    return (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
        {label}
      </Badge>
    );
  return <Badge variant="secondary">{label}</Badge>;
}

// ─── 메인 컴포넌트 ──────────────────────────────────────
export default function SettingsMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  // 멤버 제거 확인
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [removing, setRemoving] = useState(false);

  // 역할 변경 확인
  const [roleChangeTarget, setRoleChangeTarget] = useState<{
    member: Member;
    newRole: string;
  } | null>(null);
  const [roleChanging, setRoleChanging] = useState(false);

  // 초대 취소 진행 중인 id
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // 초대 링크 복사 상태
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth
      .getUser()
      .then(({ data }) => setCurrentEmail(data.user?.email ?? null));
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch("/api/organization/members"),
        fetch("/api/invitations"),
      ]);
      if (!membersRes.ok || !invitesRes.ok) {
        toast.error("데이터를 불러오지 못했습니다.");
        return;
      }
      const membersData = await membersRes.json();
      const invitesData = await invitesRes.json();
      setMembers(membersData.members ?? []);
      setInvitations(invitesData.invitations ?? []);
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshMembers() {
    try {
      const res = await fetch("/api/organization/members");
      if (!res.ok) return;
      const data = await res.json();
      setMembers(data.members ?? []);
    } catch {
      // silent fail — user can refresh page to recover
    }
  }

  async function refreshInvitations() {
    try {
      const res = await fetch("/api/invitations");
      if (!res.ok) return;
      const data = await res.json();
      // 기존에 token이 저장된 항목은 유지 (새로고침 전까지 복사 가능)
      setInvitations((prev) => {
        const tokenMap = new Map(prev.map((inv) => [inv.id, inv.token]));
        return (data.invitations ?? []).map((inv: Invitation) => ({
          ...inv,
          token: tokenMap.get(inv.id),
        }));
      });
    } catch {
      // silent fail — user can refresh page to recover
    }
  }

  // 역할 변경 — ⋯ 메뉴에서 호출, 확인 Dialog 표시
  function requestRoleChange(member: Member, newRole: string) {
    setRoleChangeTarget({ member, newRole });
  }

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
        }
      );
      if (res.ok) {
        toast.success("역할이 변경되었습니다.");
        refreshMembers();
      } else {
        const data = await res.json();
        toast.error(data.error || "역할 변경에 실패했습니다.");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setRoleChanging(false);
      setRoleChangeTarget(null);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/organization/members/${removeTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("멤버가 제거되었습니다.");
        refreshMembers();
      } else {
        const data = await res.json();
        toast.error(data.error || "멤버 제거에 실패했습니다.");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setRemoving(false);
      setRemoveTarget(null);
    }
  }

  async function handleCancelInvite(id: string) {
    setCancellingId(id);
    try {
      const res = await fetch(`/api/invitations/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("초대가 취소되었습니다.");
        refreshInvitations();
      } else {
        const data = await res.json();
        toast.error(data.error || "초대 취소에 실패했습니다.");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setCancellingId(null);
    }
  }

  // 초대 생성 완료 — token 포함하여 로컬 상태에 추가
  function handleInviteCreated(inv: CreatedInvitation) {
    setInvitations((prev) => {
      // 중복 방지 (재생성 시 교체)
      const filtered = prev.filter((i) => i.id !== inv.id);
      return [inv, ...filtered];
    });
  }

  async function handleCopyInviteUrl(inv: Invitation) {
    if (!inv.token) return;
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/invite?token=${inv.token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(inv.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("클립보드 복사에 실패했습니다.");
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-20 text-muted-foreground">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p>멤버 목록을 불러오는 중...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          멤버{" "}
          <span className="text-sm font-normal text-muted-foreground">
            {members.length}명
          </span>
        </h3>
        <Button onClick={() => setInviteOpen(true)} size="sm">
          <UserPlus className="mr-1 h-4 w-4" />
          초대
        </Button>
      </div>

      {/* 멤버 리스트 */}
      <Card>
        <div className="divide-y">
          {members.map((m) => {
            const isMe = m.email === currentEmail;
            const canManage = !isMe && m.role !== UserRole.OWNER;
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                {/* 아바타 */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${getAvatarColor(m.name)}`}
                >
                  {m.name[0]?.toUpperCase() ?? "?"}
                </div>
                {/* 이름/이메일 */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.name}
                    {isMe && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (나)
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.email}
                  </p>
                </div>
                {/* 역할 뱃지 */}
                <RoleBadge role={m.role} />
                {/* ⋯ 드롭다운 */}
                {canManage ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0"
                        />
                      }
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="bottom" align="end">
                      {m.role !== UserRole.ADMIN && (
                        <DropdownMenuItem
                          onClick={() => requestRoleChange(m, UserRole.ADMIN)}
                        >
                          관리자로 변경
                        </DropdownMenuItem>
                      )}
                      {m.role !== UserRole.MEMBER && (
                        <DropdownMenuItem
                          onClick={() => requestRoleChange(m, UserRole.MEMBER)}
                        >
                          멤버로 변경
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setRemoveTarget(m)}
                      >
                        조직에서 제거
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="w-7 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* 대기 중인 초대 — 항상 표시 */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          대기 중인 초대
        </h3>
        <Card>
          {invitations.length === 0 ? (
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              대기 중인 초대가 없습니다
            </CardContent>
          ) : (
            <div className="divide-y">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm">
                    ✉
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {inv.email ?? "링크 초대"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(inv.expiresAt).toLocaleString("ko-KR")} 만료
                    </p>
                  </div>
                  <RoleBadge role={inv.role} />
                  {/* 복사 버튼 — token 있을 때만 활성 */}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleCopyInviteUrl(inv)}
                    disabled={!inv.token}
                    title={inv.token ? "링크 복사" : "새로고침 후 복사 불가. 새 링크를 생성하세요."}
                  >
                    {copiedId === inv.id ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleCancelInvite(inv.id)}
                    disabled={cancellingId === inv.id}
                  >
                    {cancellingId === inv.id ? "취소 중..." : "취소"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 역할 변경 확인 Dialog */}
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

      {/* 멤버 제거 확인 Dialog */}
      <Dialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>멤버 제거</DialogTitle>
            <DialogDescription>
              &quot;{removeTarget?.name}&quot;님을 조직에서 제거하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removing}
            >
              {removing ? "제거 중..." : "제거"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 초대 Sheet */}
      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onCreated={handleInviteCreated}
      />
    </div>
  );
}
