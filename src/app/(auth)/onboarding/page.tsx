"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const spinner = (
  <Card className="w-full max-w-sm">
    <CardContent className="flex justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </CardContent>
  </Card>
);

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [orgName, setOrgName] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/user/memberships")
      .then((r) => r.json())
      .then((data) => {
        if ((data.memberships ?? []).length > 0) {
          router.replace("/dashboard");
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));

    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      const fullName = data.user?.user_metadata?.full_name as string | undefined;
      if (fullName) setName(fullName);
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgName.trim()) return;

    setSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("로그인이 필요합니다.");
        router.push("/login");
        return;
      }

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supabaseId: userData.user.id,
          email: userData.user.email,
          name: name.trim() || userData.user.email?.split("@")[0],
          orgName: orgName.trim(),
        }),
      });

      if (res.ok) {
        router.push(redirect);
      } else {
        const data = await res.json();
        toast.error(data.error || "팀 생성에 실패했습니다.");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) return spinner;

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="space-y-6 pt-6">
        <div className="text-center">
          <p className="text-xl font-bold">거의 다 됐어요!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            팀 이름을 정하면 바로 시작할 수 있습니다
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgName">팀 이름 *</Label>
            <Input
              id="orgName"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="예: 파이브스팟 QA팀"
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={submitting || !orgName.trim()}
          >
            {submitting ? "생성 중..." : "시작하기 →"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={spinner}>
      <OnboardingContent />
    </Suspense>
  );
}
