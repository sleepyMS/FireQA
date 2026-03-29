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

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  plan: string;
  memberCount: number;
  role: string;
}

const SLUG_REGEX = /^[a-z0-9-]+$/;

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
      .catch(() => toast.error("조직 정보를 불러오지 못했습니다."))
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
        // setOrg 먼저 업데이트 후 슬러그가 바뀌었으면 새 URL로 이동
        setOrg((prev) => (prev ? { ...prev, ...data } : prev));
        if (data.slug && data.slug !== org?.slug) {
          // 슬러그가 변경된 경우 새 URL로 리다이렉트 (toast 생략 — 페이지 이동 자체가 성공 신호)
          router.push(`/${data.slug}/settings`);
        } else {
          toast.success("설정이 저장되었습니다.");
        }
      } else {
        toast.error(data.error || "저장에 실패했습니다.");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
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
        toast.error(data.error || "토큰 생성에 실패했습니다.");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setTokenLoading(false);
    }
  }

  async function handleRevokeToken() {
    try {
      await fetch("/api/user/plugin-token", { method: "DELETE" });
      setPluginToken({ hasToken: false, lastUsedAt: null, createdAt: null });
      setGeneratedToken(null);
      toast.success("플러그인 토큰이 해제되었습니다.");
    } catch {
      toast.error("해제에 실패했습니다.");
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
      if (res.ok) {
        toast.success("조직에서 나갔습니다.");
        router.push("/");
      } else {
        const data = await res.json();
        toast.error(data.error || "조직 탈퇴에 실패했습니다.");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
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
            <p>로딩 중...</p>
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
                  title="저장되지 않은 변경사항"
                />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {org?.slug} · 멤버 {org?.memberCount ?? 0}명
            </p>
          </div>
        </div>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>조직 이름</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>슬러그</Label>
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
                소문자, 숫자, 하이픈만 사용 가능합니다
              </p>
            )}
            {slug && slugValid && (
              <p className="text-xs text-emerald-600">올바른 형식입니다</p>
            )}
          </div>
          {/* 팀 URL — 읽기 전용으로 현재 적용된 슬러그 기준의 URL 표시 */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">현재 URL</Label>
            <div className="flex items-center rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground select-all">
              <span className="text-muted-foreground/60">fireqa.com/</span>
              <span className="font-medium text-foreground">{org?.slug ?? ""}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              슬러그를 변경하면 URL도 바뀝니다. 저장 후 적용됩니다.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={!isDirty || !slugValid || saving}
            >
              {saving ? "저장 중..." : "저장"}
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
            <p className="text-sm font-semibold">Figma 플러그인 연동</p>
            <p className="text-xs text-muted-foreground">
              FigJam 플러그인에서 빠르게 연결할 토큰을 발급합니다
            </p>
          </div>
        </div>
        <CardContent className="space-y-3 pt-4">
          {!generatedToken ? (
            <>
              {pluginToken?.hasToken && (
                <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  토큰이 발급되어 있습니다.{pluginToken.lastUsedAt ? ` 마지막 사용: ${new Date(pluginToken.lastUsedAt).toLocaleDateString("ko-KR")}` : ""}
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleGenerateToken} disabled={tokenLoading}>
                  {tokenLoading ? "발급 중..." : pluginToken?.hasToken ? "토큰 재발급" : "토큰 발급하기"}
                </Button>
                {pluginToken?.hasToken && (
                  <Button size="sm" variant="outline" onClick={handleRevokeToken}>
                    해제
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-amber-700">
                이 토큰은 지금만 표시됩니다. 복사 후 플러그인에 붙여넣으세요.
              </p>
              <div className="flex gap-2">
                <code className="flex-1 truncate rounded-md bg-muted px-3 py-2 text-xs font-mono">
                  {generatedToken}
                </code>
                <Button size="sm" variant="outline" onClick={handleCopyToken}>
                  {tokenCopied ? "복사됨" : "복사"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                플러그인 → 토큰으로 연결하기 → 붙여넣기
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-semibold text-destructive">
              {isOwner ? "조직 삭제" : "조직 나가기"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isOwner && !isAlone
                ? `조직원 ${org!.memberCount - 1}명을 포함한 모든 데이터가 영구 삭제됩니다`
                : isOwner
                  ? "조직과 모든 데이터가 영구 삭제됩니다"
                  : "나가면 이 조직의 데이터에 접근할 수 없습니다"}
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setLeaveOpen(true)}
          >
            {isOwner ? "삭제" : "나가기"}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={leaveOpen} onOpenChange={(open) => { setLeaveOpen(open); if (!open) setDeleteConfirmName(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isOwner ? "조직 삭제" : "조직 나가기"}</DialogTitle>
            <DialogDescription>
              {isOwner && !isAlone
                ? `"${org?.name}" 조직원 ${org!.memberCount - 1}명을 포함한 모든 데이터가 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`
                : isOwner
                  ? `"${org?.name}" 조직과 모든 데이터가 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`
                  : `정말로 "${org?.name}" 조직을 나가시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
            </DialogDescription>
          </DialogHeader>
          {isOwner && (
            <div className="space-y-2">
              <Label className="text-sm">
                확인을 위해 조직 이름 <span className="font-semibold">{org?.name}</span>을 입력하세요
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
            <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
            <Button
              variant="destructive"
              onClick={handleLeave}
              disabled={leaving || (isOwner && deleteConfirmName !== org?.name)}
            >
              {leaving ? "처리 중..." : isOwner ? "삭제" : "나가기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
