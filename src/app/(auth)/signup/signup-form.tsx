"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/lib/i18n/locale-provider";

export default function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const { t } = useLocale();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createSupabaseBrowserClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== passwordConfirm) {
      setError(t.auth.signup.errorPasswordMismatch);
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError(t.auth.signup.errorSignupFailed);
      setLoading(false);
      return;
    }

    // 조직 생성은 온보딩에서 처리
    const onboardingRedirect = redirect !== "/" ? `?redirect=${encodeURIComponent(redirect)}` : "";
    router.push(`/onboarding${onboardingRedirect}`);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="space-y-6 pt-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">FireQA</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.auth.signup.subtitle}</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t.auth.signup.nameLabel}</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.auth.signup.namePlaceholder}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t.auth.signup.emailLabel}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.auth.signup.emailPlaceholder}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t.auth.signup.passwordLabel}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.auth.signup.passwordPlaceholder}
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="passwordConfirm">{t.auth.signup.passwordConfirmLabel}</Label>
            <Input
              id="passwordConfirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder={t.auth.signup.passwordConfirmPlaceholder}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? t.auth.signup.submitting : t.auth.signup.submit}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {t.auth.signup.hasAccount}{" "}
          <Link href="/login" className="text-primary hover:underline">
            {t.auth.signup.loginLink}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
