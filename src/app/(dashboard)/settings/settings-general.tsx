"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { PLAN_LABEL } from "@/types/enums";

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  plan: string;
  memberCount: number;
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
    setSaving(true);
    const res = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setOrg((prev) => (prev ? { ...prev, ...data } : prev));
      toast.success("조직 정보가 저장되었습니다.");
    } else {
      toast.error(data.error || "저장에 실패했습니다.");
    }
  }

  async function handleLeave() {
    setLeaving(true);
    const res = await fetch("/api/organization/leave", { method: "POST" });
    setLeaving(false);
    if (res.ok) {
      toast.success("조직에서 나갔습니다.");
      router.push("/dashboard");
      router.refresh();
    } else {
      const data = await res.json();
      toast.error(data.error || "조직 탈퇴에 실패했습니다.");
    }
    setLeaveOpen(false);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>조직 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>조직 이름</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>슬러그</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              소문자, 숫자, 하이픈만 사용 가능
            </p>
          </div>
          <div className="space-y-2">
            <Label>플랜</Label>
            <div>
              <Badge variant="secondary">
                {PLAN_LABEL[org?.plan ?? "free"] ?? org?.plan}
              </Badge>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">위험 영역</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            조직을 나가면 더 이상 이 조직의 데이터에 접근할 수 없습니다.
          </p>
          <Button variant="destructive" onClick={() => setLeaveOpen(true)}>
            조직 나가기
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
            <DialogClose render={<Button variant="outline" />}>
              취소
            </DialogClose>
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
