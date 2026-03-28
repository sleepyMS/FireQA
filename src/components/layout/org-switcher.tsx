"use client";

import { useState } from "react";
import useSWR from "swr";
import { SWR_KEYS } from "@/lib/swr/keys";
import { ChevronsUpDown, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getAvatarColor } from "@/lib/avatar-colors";

interface Membership {
  organizationId: string;
  name: string;
  slug: string;
  role: string;
}

export function OrgSwitcher() {
  const { data } = useSWR<{ memberships: Membership[]; activeOrganizationId: string | null }>(
    SWR_KEYS.memberships
  );
  const memberships = data?.memberships ?? [];
  const activeOrgId = data?.activeOrganizationId ?? null;

  const [createOpen, setCreateOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleSwitch(organizationId: string) {
    if (organizationId === activeOrgId) return;
    const res = await fetch("/api/user/active-org", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId }),
    });
    if (res.ok) {
      window.location.reload();
    } else {
      toast.error("조직 전환에 실패했습니다.");
    }
  }

  async function handleCreate() {
    if (!newOrgName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreateOpen(false);
        setNewOrgName("");
        window.location.reload();
      } else {
        toast.error(data.error || "팀 생성에 실패했습니다.");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setCreating(false);
    }
  }

  const activeOrg = memberships.find((m) => m.organizationId === activeOrgId);
  if (!activeOrg) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="h-auto w-full justify-start gap-2 px-2 py-2"
            />
          }
        >
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white ${getAvatarColor(activeOrg.name)}`}
          >
            {activeOrg.name[0]?.toUpperCase() ?? "?"}
          </div>
          <span className="flex-1 truncate text-left text-sm font-medium">
            {activeOrg.name}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="start" className="w-52">
          {memberships.map((m) => (
            <DropdownMenuItem
              key={m.organizationId}
              onClick={() => handleSwitch(m.organizationId)}
            >
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white ${getAvatarColor(m.name)}`}
              >
                {m.name[0]?.toUpperCase()}
              </div>
              <span className="flex-1 truncate">{m.name}</span>
              {m.organizationId === activeOrgId && (
                <Check className="h-3.5 w-3.5 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            새 팀 만들기
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 팀 만들기</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>팀 이름</Label>
            <Input
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="예: 파이브스팟 QA팀"
              onKeyDown={(e) => e.key === "Enter" && !creating && handleCreate()}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
            <Button
              onClick={handleCreate}
              disabled={creating || !newOrgName.trim()}
            >
              {creating ? "생성 중..." : "만들기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
