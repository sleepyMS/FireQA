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
import { useLocale } from "@/lib/i18n/locale-provider";

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

  const { t } = useLocale();
  const si = t.settings.invite;

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
                      <FormLabel>{si.roleLabel}</FormLabel>
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
                          <SelectItem value="admin">{si.roleAdmin}</SelectItem>
                          <SelectItem value="member">{si.roleMember}</SelectItem>
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
                      <FormLabel>{si.emailLabel}</FormLabel>
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
                      <FormLabel>{si.expiresLabel}</FormLabel>
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
                          <SelectItem value="24">{si.expires24h}</SelectItem>
                          <SelectItem value="72">{si.expires72h}</SelectItem>
                          <SelectItem value="168">{si.expires7d}</SelectItem>
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
              {t.common.cancel}
            </SheetClose>
            <Button
              type="submit"
              form="invite-form"
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
