"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/lib/i18n/locale-provider";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { t } = useLocale();

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== passwordConfirm) {
      setError(t.auth.resetPassword.errorPasswordMismatch);
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="space-y-6 pt-6">
        <div className="text-center">
          <h1 className="text-xl font-bold">{t.auth.resetPassword.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.auth.resetPassword.subtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t.auth.resetPassword.newPasswordLabel}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.auth.resetPassword.passwordPlaceholder}
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="passwordConfirm">{t.auth.resetPassword.passwordConfirmLabel}</Label>
            <Input
              id="passwordConfirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder={t.auth.resetPassword.passwordConfirmPlaceholder}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? t.auth.resetPassword.submitting : t.auth.resetPassword.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
