"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLAN_LABEL } from "@/types/enums";
import { useLocale } from "@/lib/i18n/locale-provider";

interface UsageData {
  plan: string;
  subscription: {
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  usage: {
    generationsThisHour: number;
    projectCount: number;
    memberCount: number;
  };
  limits: {
    generationsPerHour: number;
    projectsMax: number | null;
    membersMax: number | null;
    uploadsMaxMb: number;
  };
}

function UsageBar({ used, max }: { used: number; max: number | null }) {
  const pct = max === null ? 0 : Math.min(100, Math.round((used / max) * 100));
  return (
    <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
      <div
        className={`h-1.5 rounded-full transition-all ${pct >= 90 ? "bg-destructive" : "bg-primary"}`}
        style={{ width: max === null ? "0%" : `${pct}%` }}
      />
    </div>
  );
}

export default function SettingsBilling() {
  const { orgSlug = "" } = useParams<{ orgSlug?: string }>();
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  const { t, locale } = useLocale();
  const sb = t.settings.billing;

  useEffect(() => {
    fetch("/api/billing/usage")
      .then((r) => r.json())
      .then(setData)
      .catch(() => toast.error(sb.loadFailed))
      .finally(() => setLoading(false));
  }, []);

  async function handleUpgrade() {
    setRedirecting(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          successUrl: `${window.location.origin}/${orgSlug}/settings?tab=billing&success=1`,
          cancelUrl: `${window.location.origin}/${orgSlug}/settings?tab=billing`,
        }),
      });
      const body = await res.json();
      if (res.ok && body.url) {
        window.location.href = body.url;
      } else {
        toast.error(body.error || sb.checkoutFailed);
      }
    } catch {
      toast.error(t.common.networkError);
    } finally {
      setRedirecting(false);
    }
  }

  async function handlePortal() {
    setRedirecting(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl: `${window.location.origin}/${orgSlug}/settings?tab=billing` }),
      });
      const body = await res.json();
      if (res.ok && body.url) {
        window.location.href = body.url;
      } else {
        toast.error(body.error || sb.portalFailed);
      }
    } catch {
      toast.error(t.common.networkError);
    } finally {
      setRedirecting(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-20 text-muted-foreground">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p>{t.common.loading}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const plan = data?.plan ?? "free";
  const isPaid = plan !== "free";
  const periodEnd = data?.subscription?.currentPeriodEnd
    ? new Date(data.subscription.currentPeriodEnd).toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US")
    : null;

  return (
    <div className="space-y-4">
      {/* Current plan */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">
                {PLAN_LABEL[plan] ?? plan} {sb.planLabel}
              </p>
              <Badge variant="secondary" className="text-xs">
                {plan}
              </Badge>
              {data?.subscription?.cancelAtPeriodEnd && (
                <Badge variant="destructive" className="text-xs">
                  {sb.cancelAtEnd}
                </Badge>
              )}
            </div>
            {periodEnd && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {data?.subscription?.cancelAtPeriodEnd
                  ? `${periodEnd} ${sb.cancelsAt}`
                  : `${sb.renewsAt}: ${periodEnd}`}
              </p>
            )}
          </div>
          {isPaid ? (
            <Button variant="outline" size="sm" onClick={handlePortal} disabled={redirecting}>
              {redirecting ? sb.redirecting : sb.manageSubscription}
            </Button>
          ) : (
            <Button size="sm" onClick={handleUpgrade} disabled={redirecting}>
              {redirecting ? sb.redirecting : sb.upgradeToPro}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Usage */}
      {data && (
        <Card>
          <CardContent className="space-y-4 py-4">
            <p className="text-sm font-semibold">{sb.usageTitle}</p>

            <div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{sb.aiGeneration}</span>
                <span>
                  {data.usage.generationsThisHour} / {data.limits.generationsPerHour}
                </span>
              </div>
              <UsageBar
                used={data.usage.generationsThisHour}
                max={data.limits.generationsPerHour}
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{sb.projects}</span>
                <span>
                  {data.usage.projectCount}
                  {data.limits.projectsMax !== null ? ` / ${data.limits.projectsMax}` : ""}
                </span>
              </div>
              <UsageBar used={data.usage.projectCount} max={data.limits.projectsMax} />
            </div>

            <div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{sb.members}</span>
                <span>
                  {data.usage.memberCount}
                  {data.limits.membersMax !== null ? ` / ${data.limits.membersMax}` : ""}
                </span>
              </div>
              <UsageBar used={data.usage.memberCount} max={data.limits.membersMax} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan comparison (free only) */}
      {!isPaid && (
        <Card>
          <CardContent className="py-4">
            <p className="mb-3 text-sm font-semibold">{sb.proBenefits}</p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>{sb.proGenLimit}</li>
              <li>{sb.proProjectLimit}</li>
              <li>{sb.proMemberLimit}</li>
              <li>{sb.proUploadLimit}</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
