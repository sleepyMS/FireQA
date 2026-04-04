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
import { SLUG_REGEX, deriveOrgSlug } from "@/lib/slug";
import { useLocale } from "@/lib/i18n/locale-provider";

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
  const { t } = useLocale();

  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
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

  function handleOrgNameChange(value: string) {
    setOrgName(value);
    // 슬러그가 현재 자동 유도값과 같으면 (아직 수동 편집 안 함) 계속 자동 갱신
    if (orgSlug === deriveOrgSlug(orgName)) {
      setOrgSlug(deriveOrgSlug(value));
    }
  }

  const slugValid = SLUG_REGEX.test(orgSlug);
  const slugEmpty = orgSlug === "" && orgName.trim() !== "";
  const canSubmit = !!orgName.trim() && slugValid && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error(t.onboarding.loginRequired);
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
          orgSlug: orgSlug.trim(),
        }),
      });

      if (res.ok) {
        router.push(redirect);
      } else {
        const data = await res.json();
        toast.error(data.error || t.onboarding.createTeamFailed);
      }
    } catch {
      toast.error(t.onboarding.networkError);
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) return spinner;

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="space-y-6 pt-6">
        <div className="text-center">
          <p className="text-xl font-bold">{t.onboarding.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.onboarding.subtitle}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t.onboarding.nameLabel}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.onboarding.namePlaceholder}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgName">{t.onboarding.orgNameLabel}</Label>
            <Input
              id="orgName"
              value={orgName}
              onChange={(e) => handleOrgNameChange(e.target.value)}
              placeholder={t.onboarding.orgNamePlaceholder}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgSlug">{t.onboarding.orgSlugLabel}</Label>
            <div className="flex items-center rounded-md border bg-muted/50 focus-within:ring-2 focus-within:ring-ring">
              <span className="pl-3 text-sm text-muted-foreground select-none shrink-0">
                fireqa.com/
              </span>
              <Input
                id="orgSlug"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
                placeholder="my-team"
                className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
            </div>
            {slugEmpty && (
              <p className="text-xs text-amber-600">
                {t.onboarding.slugHintKorean}
              </p>
            )}
            {orgSlug && !slugValid && (
              <p className="text-xs text-destructive">
                {t.onboarding.slugInvalid}
              </p>
            )}
            {orgSlug && slugValid && (
              <p className="text-xs text-emerald-600">{t.onboarding.slugValid}</p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={!canSubmit}
          >
            {submitting ? t.onboarding.submitting : t.onboarding.start}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-foreground">{t.onboarding.or}</span>
          </div>
        </div>

        {!showInvite ? (
          <button
            type="button"
            onClick={() => setShowInvite(true)}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t.onboarding.joinByInvite}
          </button>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="inviteToken">{t.onboarding.inviteTokenLabel}</Label>
            <Input
              id="inviteToken"
              value={inviteToken}
              onChange={(e) => setInviteToken(e.target.value)}
              placeholder={t.onboarding.inviteTokenPlaceholder}
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
                {t.onboarding.acceptInvite}
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
