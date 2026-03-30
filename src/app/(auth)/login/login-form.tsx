"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createSupabaseBrowserClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  async function handleGoogleLogin() {
    // redirect 목적지를 쿠키에 저장 — redirectTo URL에 쿼리 파라미터를 붙이면
    // Supabase 허용 목록 매칭 실패로 Site URL(배포)로 fallback되기 때문
    document.cookie = `auth_redirect=${encodeURIComponent(redirect)};path=/;max-age=300;SameSite=Lax`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="space-y-6 pt-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">FireQA</h1>
          <p className="mt-1 text-sm text-muted-foreground">로그인하여 시작하세요</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "로그인 중..." : "로그인"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-foreground">또는</span>
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={handleGoogleLogin}>
          Google로 로그인
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="text-primary hover:underline">
            회원가입
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
