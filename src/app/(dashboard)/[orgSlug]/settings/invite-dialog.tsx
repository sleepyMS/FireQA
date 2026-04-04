"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

const inviteSchema = z.object({
  role: z.enum(["admin", "member"]),
  email: z
    .string()
    .transform((v) => v.trim())
    .pipe(
      z.union([
        z.literal(""),
        z.string().email("유효한 이메일을 입력해주세요."),
      ]),
    ),
  expiresInHours: z.number(),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

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
  const [creating, setCreating] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      role: "member",
      email: "",
      expiresInHours: 72,
    },
  });

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  function reset() {
    form.reset({ role: "member", email: "", expiresInHours: 72 });
    setInviteUrl("");
    setCopied(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleCreate(values: InviteFormValues) {
    setCreating(true);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: values.role,
          email: values.email || undefined,
          expiresInHours: values.expiresInHours,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteUrl(data.inviteUrl);
        onCreated({
          id: data.id,
          email: values.email || null,
          role: values.role,
          expiresAt: data.expiresAt,
          token: data.token,
        });
        toast.success("초대 링크가 생성되었습니다.");
      } else {
        toast.error(data.error || "초대 생성에 실패했습니다.");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
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
      toast.error("클립보드 복사에 실패했습니다.");
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>초대 링크 생성</SheetTitle>
          <SheetDescription>
            새 멤버를 초대할 링크를 생성합니다.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4">
          {inviteUrl ? (
            <div className="space-y-4 pt-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="mb-2 text-xs font-semibold text-emerald-700">
                  초대 링크가 생성되었습니다
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
                시트를 닫아도 목록에서 다시 복사할 수 있습니다.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={reset}
              >
                새 링크 생성
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form
                id="invite-form"
                onSubmit={form.handleSubmit(handleCreate)}
                className="space-y-4 pt-2"
              >
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>역할</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) => v && field.onChange(v)}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">관리자</SelectItem>
                          <SelectItem value="member">멤버</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이메일 (선택)</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="user@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expiresInHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>만료</FormLabel>
                      <Select
                        value={String(field.value)}
                        onValueChange={(v) => v && field.onChange(Number(v))}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="24">24시간</SelectItem>
                          <SelectItem value="72">72시간</SelectItem>
                          <SelectItem value="168">7일</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          )}
        </div>

        {!inviteUrl && (
          <SheetFooter className="flex-row px-4">
            <SheetClose render={<Button variant="outline" className="flex-1" />}>
              취소
            </SheetClose>
            <Button
              type="submit"
              form="invite-form"
              disabled={creating}
              className="flex-1"
            >
              {creating ? "생성 중..." : "링크 생성"}
            </Button>
          </SheetFooter>
        )}
        {inviteUrl && (
          <SheetFooter className="px-4">
            <Button onClick={handleClose} className="w-full">
              닫기
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
