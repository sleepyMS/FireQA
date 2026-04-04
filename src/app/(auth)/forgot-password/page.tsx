"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/lib/i18n/locale-provider";

export default function ForgotPasswordPage() {
  const { t } = useLocale();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="space-y-6 pt-6">
        <div className="text-center">
          <h1 className="text-xl font-bold">{t.auth.forgotPassword.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.auth.forgotPassword.subtitle}
          </p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-emerald-600 font-medium">
              {t.auth.forgotPassword.sentMessage}
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full">{t.auth.forgotPassword.backToLogin}</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t.auth.forgotPassword.emailLabel}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.auth.forgotPassword.emailPlaceholder}
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? t.auth.forgotPassword.submitting : t.auth.forgotPassword.submit}
            </Button>

            <Link href="/login">
              <Button variant="ghost" className="w-full">{t.auth.forgotPassword.back}</Button>
            </Link>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
