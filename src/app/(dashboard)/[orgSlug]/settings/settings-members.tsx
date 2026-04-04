"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Copy, Check, UserPlus, Mail } from "lucide-react";
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
import { getAvatarColor } from "@/lib/avatar-colors";
import { useLocale } from "@/lib/i18n/locale-provider";
import InviteDialog, { type CreatedInvitation } from "./invite-dialog";

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
  token?: string; // only present immediately after creation, gone after page refresh
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

  const [roleChangeTarget, setRoleChangeTarget] = useState<{
    member: Member;
    newRole: string;
  } | null>(null);
  const [roleChanging, setRoleChanging] = useState(false);

  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { t } = useLocale();
  const sm = t.settings.members;

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

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
        toast.error(sm.loadFailed);
        return;
      }
      const membersData = await membersRes.json();
      const invitesData = await invitesRes.json();
      setMembers(membersData.members ?? []);
      setInvitations(invitesData.invitations ?? []);
    } catch {
      toast.error(t.common.networkError);
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
      // preserve tokens from previous state until page refresh
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
        toast.success(sm.roleChangeOk);
        refreshMembers();
      } else {
        const data = await res.json();
        toast.error(data.error || sm.roleChangeFailed);
      }
    } catch {
      toast.error(t.common.networkError);
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
        toast.success(sm.removeOk);
        refreshMembers();
      } else {
        const data = await res.json();
        toast.error(data.error || sm.removeFailed);
      }
    } catch {
      toast.error(t.common.networkError);
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
        toast.success(sm.cancelInviteOk);
        refreshInvitations();
      } else {
        const data = await res.json();
        toast.error(data.error || sm.cancelInviteFailed);
      }
    } catch {
      toast.error(t.common.networkError);
    } finally {
      setCancellingId(null);
    }
  }

  function handleInviteCreated(inv: CreatedInvitation) {
    setInvitations((prev) => {
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
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      setCopiedId(inv.id);
      copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error(sm.copyFailed);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-20 text-muted-foreground">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p>{t.common.loading}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {sm.title}{" "}
          <span className="text-sm font-normal text-muted-foreground">
            {members.length}
          </span>
        </h3>
        <Button onClick={() => setInviteOpen(true)} size="sm">
          <UserPlus className="mr-1 h-4 w-4" />
          {sm.invite}
        </Button>
      </div>

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
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${getAvatarColor(m.name)}`}
                >
                  {m.name[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.name}
                    {isMe && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({sm.me})
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.email}
                  </p>
                </div>
                <RoleBadge role={m.role} />
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
                          {sm.changeToAdmin}
                        </DropdownMenuItem>
                      )}
                      {m.role !== UserRole.MEMBER && (
                        <DropdownMenuItem
                          onClick={() => requestRoleChange(m, UserRole.MEMBER)}
                        >
                          {sm.changeToMember}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setRemoveTarget(m)}
                      >
                        {sm.removeFromOrg}
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

      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {sm.pendingInvites}
        </h3>
        {invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">{sm.noPendingInvites}</p>
        ) : (
          <div className="rounded-lg border bg-muted/30 p-2 space-y-1">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 rounded-md bg-card px-4 py-3"
              >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {inv.email ?? sm.linkInvite}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(inv.expiresAt).toLocaleString()} {sm.expires}
                    </p>
                  </div>
                  <RoleBadge role={inv.role} />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleCopyInviteUrl(inv)}
                    disabled={!inv.token}
                    title={inv.token ? sm.copyLink : sm.copyLinkStale}
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
                    {cancellingId === inv.id ? sm.cancelling : t.common.cancel}
                  </Button>
                </div>
              ))}
            </div>
          )}
      </div>

      <Dialog
        open={!!roleChangeTarget}
        onOpenChange={(open) => !open && setRoleChangeTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{sm.roleChangeTitle}</DialogTitle>
            <DialogDescription>
              &quot;{roleChangeTarget?.member.name}&quot; {sm.roleChangeDesc}{" "}
              <strong>{ROLE_LABEL[roleChangeTarget?.newRole ?? ""] ?? roleChangeTarget?.newRole}</strong>{" "}
              {sm.roleChangeSuffix}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t.common.cancel}</DialogClose>
            <Button onClick={confirmRoleChange} disabled={roleChanging}>
              {roleChanging ? sm.roleChanging : sm.roleChangeConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{sm.removeMemberTitle}</DialogTitle>
            <DialogDescription>
              &quot;{removeTarget?.name}&quot; {sm.removeMemberDesc}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t.common.cancel}</DialogClose>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removing}
            >
              {removing ? sm.removing : t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onCreated={handleInviteCreated}
      />
    </div>
  );
}
