"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { useLocale } from "@/lib/i18n/locale-provider";

export interface CreatedInvitation {
  id: string;
  email: string | null;
  role: string;
  expiresAt: string;
  token: string;
}

interface InviteSheetProps {
  open: boolean;
  onClose: () => void;
  onCreated: (inv: CreatedInvitation) => void;
}

export default function InviteDialog({
  open,
  onClose,
  onCreated,
}: InviteSheetProps) {
  const [role, setRole] = useState("member");
  const [email, setEmail] = useState("");
  const [expiresInHours, setExpiresInHours] = useState(72);
  const [creating, setCreating] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { t } = useLocale();
  const si = t.settings.invite;

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  function reset() {
    setRole("member");
    setEmail("");
    setExpiresInHours(72);
    setInviteUrl("");
    setCopied(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          email: email.trim() || undefined,
          expiresInHours,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteUrl(data.inviteUrl);
        onCreated({
          id: data.id,
          email: email.trim() || null,
          role,
          expiresAt: data.expiresAt,
          token: data.token,
        });
        toast.success(si.createdOk);
      } else {
        toast.error(data.error || si.createFailed);
      }
    } catch {
      toast.error(t.common.networkError);
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      setCopied(true);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(si.copyFailed);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{si.title}</SheetTitle>
          <SheetDescription>
            {si.description}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4">
          {inviteUrl ? (
            <div className="space-y-4 pt-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="mb-2 text-xs font-semibold text-emerald-700">
                  {si.createdTitle}
                </p>
                <div className="flex gap-2">
                  <Input
                    value={inviteUrl}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {si.copyable}
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={reset}
              >
                {si.newLinkBtn}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>{si.roleLabel}</Label>
                <Select
                  value={role}
                  onValueChange={(v) => v && setRole(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{si.roleAdmin}</SelectItem>
                    <SelectItem value="member">{si.roleMember}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{si.emailLabel}</Label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{si.expiresLabel}</Label>
                <Select
                  value={String(expiresInHours)}
                  onValueChange={(v) => v && setExpiresInHours(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">{si.expires24h}</SelectItem>
                    <SelectItem value="72">{si.expires72h}</SelectItem>
                    <SelectItem value="168">{si.expires7d}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {!inviteUrl && (
          <SheetFooter className="flex-row px-4">
            <SheetClose render={<Button variant="outline" className="flex-1" />}>
              {t.common.cancel}
            </SheetClose>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="flex-1"
            >
              {creating ? si.creating : si.createBtn}
            </Button>
          </SheetFooter>
        )}
        {inviteUrl && (
          <SheetFooter className="px-4">
            <Button onClick={handleClose} className="w-full">
              {t.common.close}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
