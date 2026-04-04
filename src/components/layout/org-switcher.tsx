"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import useSWR from "swr";
import { SWR_KEYS } from "@/lib/swr/keys";
import { ChevronsUpDown, Check, Plus, LogIn } from "lucide-react";
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
import { deriveOrgSlug } from "@/lib/slug";
import { useLocale } from "@/lib/i18n/locale-provider";

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

function extractInviteToken(input: string): string {
  try {
    const url = new URL(input);
    return url.searchParams.get("token") ?? input;
  } catch {
    return input;
  }
}


export function OrgSwitcher({ initialMemberships, initialActiveOrgId }: OrgSwitcherProps) {
  const router = useRouter();
  const params = useParams<{ orgSlug?: string }>();
  const currentOrgSlug = params.orgSlug;
  const { t } = useLocale();

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
  const [joinOpen, setJoinOpen] = useState(false);
  const [inviteInput, setInviteInput] = useState("");

  function handleNameChange(name: string) {
    setNewOrgName(name);
    if (!slugManuallyEdited) {
      setNewOrgSlug(deriveOrgSlug(name));
    }
  }

  function handleSlugChange(slug: string) {
    setNewOrgSlug(slug.toLowerCase().replace(/[^a-z0-9-]/g, ""));
    setSlugManuallyEdited(true);
  }

  function handleSwitch(slug: string) {
    if (slug === currentOrgSlug) return;
    // URL change triggers org switch — [orgSlug]/layout.tsx handles session sync
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
          toast.error(t.teams.slugMissingError);
          return;
        }
        setCreateOpen(false);
        setNewOrgName("");
        setNewOrgSlug("");
        setSlugManuallyEdited(false);
        await mutate();
        router.push(`/${responseData.slug}/dashboard`);
      } else {
        toast.error(responseData.error || t.teams.createFailedError);
      }
    } catch {
      toast.error(t.teams.networkError);
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
            {t.teams.createNew}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setJoinOpen(true)}>
            <LogIn className="h-4 w-4" />
            {t.teams.joinViaCode}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={joinOpen} onOpenChange={(open) => { setJoinOpen(open); if (!open) setInviteInput(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.teams.joinViaCode}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t.teams.inviteLinkOrCode}</Label>
            <Input
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              placeholder={t.teams.inviteLinkPlaceholder}
              onKeyDown={(e) => {
                if (e.key === "Enter" && inviteInput.trim()) {
                  router.push(`/invite?token=${extractInviteToken(inviteInput.trim())}`);
                  setJoinOpen(false);
                  setInviteInput("");
                }
              }}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t.common.cancel}</DialogClose>
            <Button
              disabled={!inviteInput.trim()}
              onClick={() => {
                router.push(`/invite?token=${extractInviteToken(inviteInput.trim())}`);
                setJoinOpen(false);
                setInviteInput("");
              }}
            >
              {t.teams.join}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <DialogTitle>{t.teams.createNew}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.teams.teamName}</Label>
              <Input
                value={newOrgName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={t.teams.teamNamePlaceholder}
                onKeyDown={(e) => e.key === "Enter" && !creating && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.teams.urlSlug}</Label>
              <div className="flex items-center gap-1">
                <span className="shrink-0 text-sm text-muted-foreground">fireqa.com/</span>
                <Input
                  value={newOrgSlug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="my-team"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">{t.teams.slugHelp}</p>
              {newOrgSlug && !newOrgSlug.replace(/-/g, "").length && (
                <p className="text-xs text-destructive">{t.teams.slugError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t.common.cancel}</DialogClose>
            <Button onClick={handleCreate} disabled={creating || !newOrgName.trim() || !newOrgSlug.replace(/-/g, "").length}>
              {creating ? t.teams.creating : t.teams.makeTeam}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
