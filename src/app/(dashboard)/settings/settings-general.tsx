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
import { getAvatarColor } from "@/lib/avatar-colors";

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  plan: string;
  memberCount: number;
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

  const isDirty = org !== null && (name !== org.name || slug !== org.slug);
  const slugValid = SLUG_REGEX.test(slug);

  useEffect(() => {
    fetch("/api/organization")
      .then((r) => r.json())
      .then((data) => {
        setOrg(data);
        setName(data.name);
        setSlug(data.slug);
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
        setOrg((prev) => (prev ? { ...prev, ...data } : prev));
        toast.success("조직 정보가 저장되었습니다.");
      } else {
        toast.error(data.error || "저장에 실패했습니다.");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLeave() {
    setLeaving(true);
    try {
      const res = await fetch("/api/organization/leave", { method: "POST" });
      if (res.ok) {
        toast.success("조직에서 나갔습니다.");
        router.push("/dashboard");
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

      <Card className="border-destructive/30">
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-semibold text-destructive">조직 나가기</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              나가면 이 조직의 데이터에 접근할 수 없습니다
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setLeaveOpen(true)}
          >
            나가기
          </Button>
        </CardContent>
      </Card>

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>조직 나가기</DialogTitle>
            <DialogDescription>
              정말로 &quot;{org?.name}&quot; 조직을 나가시겠습니까? 이 작업은
              되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
            <Button
              variant="destructive"
              onClick={handleLeave}
              disabled={leaving}
            >
              {leaving ? "처리 중..." : "나가기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
