"use client";

import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

interface InviteDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function InviteDialog({
  open,
  onClose,
  onCreated,
}: InviteDialogProps) {
  const [role, setRole] = useState("member");
  const [email, setEmail] = useState("");
  const [expiresInHours, setExpiresInHours] = useState("72");
  const [creating, setCreating] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);

  function reset() {
    setRole("member");
    setEmail("");
    setExpiresInHours("72");
    setInviteUrl("");
    setCopied(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleCreate() {
    setCreating(true);
    const res = await fetch("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        email: email.trim() || undefined,
        expiresInHours: Number(expiresInHours),
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (res.ok) {
      setInviteUrl(data.inviteUrl);
      onCreated();
      toast.success("초대 링크가 생성되었습니다.");
    } else {
      toast.error(data.error || "초대 생성에 실패했습니다.");
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>초대 링크 생성</DialogTitle>
          <DialogDescription>
            새 멤버를 초대할 링크를 생성합니다.
          </DialogDescription>
        </DialogHeader>

        {inviteUrl ? (
          <div className="space-y-3">
            <Label>초대 링크</Label>
            <div className="flex gap-2">
              <Input value={inviteUrl} readOnly />
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            {copied && <p className="text-xs text-green-600">복사됨!</p>}
            <DialogFooter>
              <Button onClick={handleClose}>닫기</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>역할</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">관리자</SelectItem>
                    <SelectItem value="member">멤버</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>이메일 (선택)</Label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>만료</Label>
                <Select
                  value={expiresInHours}
                  onValueChange={setExpiresInHours}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24시간</SelectItem>
                    <SelectItem value="72">72시간</SelectItem>
                    <SelectItem value="168">7일</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                취소
              </DialogClose>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? "생성 중..." : "생성"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
