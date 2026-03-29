"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
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

interface OrgSwitcherProps {
  initialMemberships: Membership[];
  initialActiveOrgId: string | null;
}

function deriveSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 48)
    .replace(/^-+|-+$/g, "");
}

export function OrgSwitcher({ initialMemberships, initialActiveOrgId }: OrgSwitcherProps) {
  const router = useRouter();
  const params = useParams<{ orgSlug?: string }>();
  const currentOrgSlug = params.orgSlug;

  const { data, mutate } = useSWR<{
    memberships: Membership[];
    activeOrganizationId: string | null;
  }>(SWR_KEYS.memberships, {
    fallbackData: { memberships: initialMemberships, activeOrganizationId: initialActiveOrgId },
  });

  const memberships = data?.memberships ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [creating, setCreating] = useState(false);

  function handleNameChange(name: string) {
    setNewOrgName(name);
    if (!slugManuallyEdited) {
      setNewOrgSlug(deriveSlug(name));
    }
  }

  function handleSlugChange(slug: string) {
    setNewOrgSlug(slug.toLowerCase().replace(/[^a-z0-9-]/g, ""));
    setSlugManuallyEdited(true);
  }

  function handleSwitch(slug: string) {
    if (slug === currentOrgSlug) return;
    // URL 변경만으로 전환 — [orgSlug]/layout.tsx가 세션 동기화 처리
    router.push(`/${slug}/dashboard`);
  }

  async function handleCreate() {
    if (!newOrgName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newOrgName.trim(),
          slug: newOrgSlug.trim() || undefined,
        }),
      });
      const responseData = await res.json();
      if (res.ok) {
        if (!responseData.slug) {
          toast.error("서버 응답에 슬러그가 없습니다.");
          return;
        }
        setCreateOpen(false);
        setNewOrgName("");
        setNewOrgSlug("");
        setSlugManuallyEdited(false);
        await mutate();
        router.push(`/${responseData.slug}/dashboard`);
      } else {
        toast.error(responseData.error || "팀 생성에 실패했습니다.");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setCreating(false);
    }
  }

  const activeOrg = memberships.find((m) => m.slug === currentOrgSlug) ?? memberships[0];
  if (!activeOrg) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" className="h-auto w-full justify-start gap-2 px-2 py-2" />
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
            <DropdownMenuItem key={m.organizationId} onClick={() => handleSwitch(m.slug)}>
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white ${getAvatarColor(m.name)}`}
              >
                {m.name[0]?.toUpperCase()}
              </div>
              <span className="flex-1 truncate">{m.name}</span>
              {m.slug === currentOrgSlug && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            새 팀 만들기
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setNewOrgName("");
            setNewOrgSlug("");
            setSlugManuallyEdited(false);
          }
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 팀 만들기</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>팀 이름</Label>
              <Input
                value={newOrgName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="예: 파이브스팟 QA팀"
                onKeyDown={(e) => e.key === "Enter" && !creating && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <Label>URL 슬러그</Label>
              <div className="flex items-center gap-1">
                <span className="shrink-0 text-sm text-muted-foreground">fireqa.com/</span>
                <Input
                  value={newOrgSlug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="my-team"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">소문자, 숫자, 하이픈만 사용 가능</p>
              {newOrgSlug && !newOrgSlug.replace(/-/g, "").length && (
                <p className="text-xs text-destructive">슬러그는 영문자나 숫자를 포함해야 합니다.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
            <Button onClick={handleCreate} disabled={creating || !newOrgName.trim() || !newOrgSlug.replace(/-/g, "").length}>
              {creating ? "생성 중..." : "만들기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
