"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Key } from "lucide-react";
import { getAvatarColor } from "@/lib/avatar-colors";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { Locale } from "@/lib/i18n/messages";
import { SLUG_REGEX } from "@/lib/slug";

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  plan: string;
  memberCount: number;
  role: string;
}


export default function SettingsGeneral() {
  const router = useRouter();
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [pluginToken, setPluginToken] = useState<{ hasToken: boolean; lastUsedAt: string | null; createdAt: string | null } | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);

  const { t, locale, setLocale } = useLocale();
  const sg = t.settings.general;
  const isDirty = org !== null && (name !== org.name || slug !== org.slug);
  const isOwner = org?.role === "owner";
  const isAlone = (org?.memberCount ?? 0) <= 1;
  const slugValid = SLUG_REGEX.test(slug);

  useEffect(() => {
    Promise.all([
      fetch("/api/organization").then((r) => r.json()),
      fetch("/api/user/plugin-token").then((r) => r.json()),
    ])
      .then(([orgData, tokenData]) => {
        setOrg(orgData);
        setName(orgData.name);
        setSlug(orgData.slug);
        setPluginToken(tokenData);
      })
      .catch(() => toast.error(sg.loadFailed))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!isDirty || !slugValid) return;
    setSaving(true);
    try {
      const res = await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrg((prev) => (prev ? { ...prev, ...data } : prev));
        if (data.slug && data.slug !== org?.slug) {
          router.push(`/${data.slug}/settings`);
        } else {
          toast.success(sg.savedOk);
        }
      } else {
        toast.error(data.error || sg.saveFailed);
      }
    } catch {
      toast.error(t.common.networkError);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateToken() {
    setTokenLoading(true);
    try {
      const res = await fetch("/api/user/plugin-token", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setGeneratedToken(data.token);
        setPluginToken({ hasToken: true, lastUsedAt: null, createdAt: new Date().toISOString() });
      } else {
        toast.error(data.error || sg.tokenGenFailed);
      }
    } catch {
      toast.error(t.common.networkError);
    } finally {
      setTokenLoading(false);
    }
  }

  async function handleRevokeToken() {
    try {
      await fetch("/api/user/plugin-token", { method: "DELETE" });
      setPluginToken({ hasToken: false, lastUsedAt: null, createdAt: null });
      setGeneratedToken(null);
      toast.success(sg.tokenRevoked);
    } catch {
      toast.error(sg.tokenRevokeFailed);
    }
  }

  async function handleCopyToken() {
    if (!generatedToken) return;
    await navigator.clipboard.writeText(generatedToken);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  }

  async function handleLeave() {
    setLeaving(true);
    try {
      const res = await fetch("/api/organization/leave", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(isOwner ? sg.deleteOk : sg.leaveOk);
        router.push(data.redirectTo ?? "/onboarding");
      } else {
        toast.error(data.error || (isOwner ? sg.deleteFailed : sg.leaveFailed));
      }
    } catch {
      toast.error(t.common.networkError);
    } finally {
      setLeaving(false);
      setLeaveOpen(false);
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

  const avatarColor = org ? getAvatarColor(org.name) : "bg-indigo-500";
  const initial = (org?.name ?? "?")[0].toUpperCase();

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-4 border-b p-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-bold text-white ${avatarColor}`}
          >
            {initial}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold">{org?.name}</span>
              {isDirty && (
                <span
                  className="h-1.5 w-1.5 rounded-full bg-amber-400"
                  title={sg.unsavedDot}
                />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {org?.slug} · {sg.memberCount} {org?.memberCount ?? 0}
            </p>
          </div>
        </div>
        <CardContent className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{sg.orgName}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{sg.slug}</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className={
                slug && !slugValid
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              }
            />
            {slug && !slugValid && (
              <p className="text-xs text-destructive">
                {sg.slugInvalid}
              </p>
            )}
            {slug && slugValid && (
              <p className="text-xs text-emerald-600">{sg.slugValid}</p>
            )}
          </div>
          {/* Team URL — read-only display of currently applied slug URL */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">{sg.currentUrl}</Label>
            <div className="flex items-center rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground select-all">
              <span className="text-muted-foreground/60">fireqa.com/</span>
              <span className="font-medium text-foreground">{org?.slug ?? ""}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {sg.slugChangeNote}
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={!isDirty || !slugValid || saving}
            >
              {saving ? t.common.saving : t.common.save}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-semibold">{t.settings.locale.label}</p>
          </div>
          <div className="flex gap-1 rounded-md border p-0.5">
            {(["ko", "en"] as Locale[]).map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  locale === l
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.settings.locale[l]}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="flex items-center gap-3 border-b p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100">
            <Key className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-semibold">{sg.figmaPluginTitle}</p>
            <p className="text-xs text-muted-foreground">
              {sg.figmaPluginDesc}
            </p>
          </div>
        </div>
        <CardContent className="space-y-3 py-2">
          {!generatedToken ? (
            <>
              {pluginToken?.hasToken && (
                <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  {sg.tokenIssued}{pluginToken.lastUsedAt ? ` ${sg.tokenLastUsed}: ${new Date(pluginToken.lastUsedAt).toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US")}` : ""}
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleGenerateToken} disabled={tokenLoading}>
                  {tokenLoading ? sg.tokenIssuing : pluginToken?.hasToken ? sg.tokenReissue : sg.tokenIssueBtn}
                </Button>
                {pluginToken?.hasToken && (
                  <Button size="sm" variant="outline" onClick={handleRevokeToken}>
                    {sg.tokenRevoke}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-amber-700">
                {sg.tokenOnce}
              </p>
              <div className="flex gap-2">
                <code className="flex-1 truncate rounded-md bg-muted px-3 py-2 text-xs font-mono">
                  {generatedToken}
                </code>
                <Button size="sm" variant="outline" onClick={handleCopyToken}>
                  {tokenCopied ? sg.tokenCopied : sg.tokenCopy}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {sg.tokenPasteHint}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-semibold text-destructive">
              {isOwner ? sg.deleteOrg : sg.leaveOrg}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isOwner && !isAlone
                ? sg.deleteOrgDesc.replace("{count}", String(org!.memberCount - 1))
                : isOwner
                  ? sg.deleteOrgDescAlone
                  : sg.leaveOrgDesc}
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setLeaveOpen(true)}
          >
            {isOwner ? sg.deleteBtn : sg.leaveBtn}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={leaveOpen} onOpenChange={(open) => { setLeaveOpen(open); if (!open) setDeleteConfirmName(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isOwner ? sg.deleteOrg : sg.leaveOrg}</DialogTitle>
            <DialogDescription>
              {isOwner && !isAlone
                ? `"${org?.name}" ` + sg.deleteOrgDialogDescWithMembers.replace("{count}", String(org!.memberCount - 1))
                : isOwner
                  ? `"${org?.name}" ` + sg.deleteOrgDialogDescAlone
                  : `"${org?.name}" ` + sg.leaveOrgDialogDesc}
            </DialogDescription>
          </DialogHeader>
          {isOwner && (
            <div className="space-y-2">
              <Label className="text-sm">
                {sg.confirmNameLabel} <span className="font-semibold">{org?.name}</span>
              </Label>
              <Input
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={org?.name}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && deleteConfirmName === org?.name && !leaving) handleLeave();
                }}
              />
            </div>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t.common.cancel}</DialogClose>
            <Button
              variant="destructive"
              onClick={handleLeave}
              disabled={leaving || (isOwner && deleteConfirmName !== org?.name)}
            >
              {leaving ? sg.processing : isOwner ? sg.deleteBtn : sg.leaveBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
