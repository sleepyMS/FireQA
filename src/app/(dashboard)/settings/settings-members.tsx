"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import InviteDialog from "./invite-dialog";

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
}

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

export default function SettingsMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth
      .getUser()
      .then(({ data }) => setCurrentEmail(data.user?.email ?? null));
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [membersRes, invitesRes] = await Promise.all([
      fetch("/api/organization/members"),
      fetch("/api/invitations"),
    ]);
    const membersData = await membersRes.json();
    const invitesData = await invitesRes.json();
    setMembers(membersData.members ?? []);
    setInvitations(invitesData.invitations ?? []);
    setLoading(false);
  }

  async function refreshMembers() {
    const res = await fetch("/api/organization/members");
    const data = await res.json();
    setMembers(data.members ?? []);
  }

  async function refreshInvitations() {
    const res = await fetch("/api/invitations");
    const data = await res.json();
    setInvitations(data.invitations ?? []);
  }

  async function handleRoleChange(memberId: string, role: string) {
    const res = await fetch(`/api/organization/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      toast.success("역할이 변경되었습니다.");
      refreshMembers();
    } else {
      const data = await res.json();
      toast.error(data.error || "역할 변경에 실패했습니다.");
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    const res = await fetch(`/api/organization/members/${removeTarget.id}`, {
      method: "DELETE",
    });
    setRemoving(false);
    if (res.ok) {
      toast.success("멤버가 제거되었습니다.");
      refreshMembers();
    } else {
      const data = await res.json();
      toast.error(data.error || "멤버 제거에 실패했습니다.");
    }
    setRemoveTarget(null);
  }

  async function handleCancelInvite(id: string) {
    const res = await fetch(`/api/invitations/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("초대가 취소되었습니다.");
      refreshInvitations();
    } else {
      const data = await res.json();
      toast.error(data.error || "초대 취소에 실패했습니다.");
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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">멤버</h3>
        <Button onClick={() => setInviteOpen(true)} size="sm">
          <UserPlus className="mr-1 h-4 w-4" />
          초대 링크 생성
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead>역할</TableHead>
              <TableHead className="w-24">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => {
              const isMe = m.email === currentEmail;
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    {m.name}
                    {isMe && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (나)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell>
                    {isMe ? (
                      <RoleBadge role={m.role} />
                    ) : (
                      <Select
                        value={m.role}
                        onValueChange={(val) => val && handleRoleChange(m.id, val)}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">소유자</SelectItem>
                          <SelectItem value="admin">관리자</SelectItem>
                          <SelectItem value="member">멤버</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {!isMe && m.role !== UserRole.OWNER && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setRemoveTarget(m)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {invitations.length > 0 && (
        <>
          <h3 className="text-lg font-semibold">대기 중인 초대</h3>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이메일</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead>만료</TableHead>
                  <TableHead className="w-24">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.email ?? "이메일 미지정"}</TableCell>
                    <TableCell>
                      <RoleBadge role={inv.role} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(inv.expiresAt).toLocaleString("ko-KR")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelInvite(inv.id)}
                      >
                        취소
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

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
            <DialogClose render={<Button variant="outline" />}>
              취소
            </DialogClose>
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

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onCreated={refreshInvitations}
      />
    </div>
  );
}
