"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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

// 초대 링크(URL) 또는 토큰 문자열 모두 수용
function extractToken(input: string): string {
  try {
    const url = new URL(input);
    return url.searchParams.get("token") ?? input;
  } catch {
    return input;
  }
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const [orgName, setOrgName] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [inviteToken, setInviteToken] = useState("");
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    fetch("/api/user/memberships")
      .then((r) => r.json())
      .then((data) => {
        if ((data.memberships ?? []).length > 0) {
          router.replace("/");
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

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-foreground">또는</span>
          </div>
        </div>

        {!showInvite ? (
          <button
            type="button"
            onClick={() => setShowInvite(true)}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            초대 코드로 기존 팀 참여하기
          </button>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="inviteToken">초대 코드 또는 초대 링크</Label>
            <Input
              id="inviteToken"
              value={inviteToken}
              onChange={(e) => setInviteToken(e.target.value)}
              placeholder="초대 링크를 붙여넣으세요"
            />
            <Link
              href={inviteToken.trim() ? `/invite?token=${extractToken(inviteToken.trim())}` : "#"}
              className="block"
            >
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={!inviteToken.trim()}
              >
                초대 수락하기 →
              </Button>
            </Link>
          </div>
        )}
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
