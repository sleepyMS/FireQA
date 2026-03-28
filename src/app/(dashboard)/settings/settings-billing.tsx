"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLAN_LABEL } from "@/types/enums";

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
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    fetch("/api/billing/usage")
      .then((r) => r.json())
      .then(setData)
      .catch(() => toast.error("사용량 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  async function handleUpgrade() {
    setRedirecting(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          successUrl: `${window.location.origin}/settings?tab=billing&success=1`,
          cancelUrl: `${window.location.origin}/settings?tab=billing`,
        }),
      });
      const body = await res.json();
      if (res.ok && body.url) {
        window.location.href = body.url;
      } else {
        toast.error(body.error || "결제 페이지로 이동하지 못했습니다.");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
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
        body: JSON.stringify({ returnUrl: `${window.location.origin}/settings?tab=billing` }),
      });
      const body = await res.json();
      if (res.ok && body.url) {
        window.location.href = body.url;
      } else {
        toast.error(body.error || "포털 페이지로 이동하지 못했습니다.");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
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
            <p>로딩 중...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const plan = data?.plan ?? "free";
  const isPaid = plan !== "free";
  const periodEnd = data?.subscription?.currentPeriodEnd
    ? new Date(data.subscription.currentPeriodEnd).toLocaleDateString("ko-KR")
    : null;

  return (
    <div className="space-y-4">
      {/* 현재 플랜 */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">
                {PLAN_LABEL[plan] ?? plan} 플랜
              </p>
              <Badge variant="secondary" className="text-xs">
                {plan}
              </Badge>
              {data?.subscription?.cancelAtPeriodEnd && (
                <Badge variant="destructive" className="text-xs">
                  기간 만료 시 해지
                </Badge>
              )}
            </div>
            {periodEnd && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {data?.subscription?.cancelAtPeriodEnd
                  ? `${periodEnd}에 해지됩니다`
                  : `다음 갱신일: ${periodEnd}`}
              </p>
            )}
          </div>
          {isPaid ? (
            <Button variant="outline" size="sm" onClick={handlePortal} disabled={redirecting}>
              {redirecting ? "이동 중..." : "구독 관리"}
            </Button>
          ) : (
            <Button size="sm" onClick={handleUpgrade} disabled={redirecting}>
              {redirecting ? "이동 중..." : "Pro로 업그레이드"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 사용량 */}
      {data && (
        <Card>
          <CardContent className="space-y-4 py-4">
            <p className="text-sm font-semibold">이번 시간 사용량</p>

            <div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>AI 생성</span>
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
                <span>프로젝트</span>
                <span>
                  {data.usage.projectCount}
                  {data.limits.projectsMax !== null ? ` / ${data.limits.projectsMax}` : ""}
                </span>
              </div>
              <UsageBar used={data.usage.projectCount} max={data.limits.projectsMax} />
            </div>

            <div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>멤버</span>
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

      {/* 플랜 비교 (free일 때만) */}
      {!isPaid && (
        <Card>
          <CardContent className="py-4">
            <p className="mb-3 text-sm font-semibold">Pro 플랜 혜택</p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>✓ AI 생성 시간당 100회 (현재: 20회)</li>
              <li>✓ 프로젝트 최대 20개 (현재: 3개)</li>
              <li>✓ 멤버 최대 10명 (현재: 3명)</li>
              <li>✓ 업로드 파일 최대 50MB (현재: 10MB)</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
