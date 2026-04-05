"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/dialog";

const CONFIRM_TEXT = "탈퇴하기";

export default function AccountDanger() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  const confirmed = confirmInput === CONFIRM_TEXT;

  async function handleDelete() {
    if (!confirmed) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "회원탈퇴에 실패했습니다.");
        setDeleting(false);
        return;
      }
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
      setDeleting(false);
    }
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <AlertTriangle className="h-4 w-4" />
          회원탈퇴
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          계정을 삭제하면 모든 데이터가 영구적으로 제거됩니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>모든 조직 멤버십 제거</li>
          <li>API 키 및 에이전트 연결 삭제</li>
          <li>생성된 작업 기록 삭제</li>
        </ul>
        <p className="text-sm font-medium text-destructive">
          단독 소유자인 조직은 탈퇴 시 함께 삭제됩니다.
        </p>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          회원탈퇴
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); setConfirmInput(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>정말로 탈퇴하시겠습니까?</DialogTitle>
            <DialogDescription>
              이 작업은 취소할 수 없습니다. 계정과 모든 관련 데이터가 영구 삭제됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-input">
              확인을 위해 <span className="font-mono font-bold">{CONFIRM_TEXT}</span>를 입력하세요
            </Label>
            <Input
              id="confirm-input"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={CONFIRM_TEXT}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!confirmed || deleting}
            >
              {deleting ? "처리 중..." : "계정 영구 삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
