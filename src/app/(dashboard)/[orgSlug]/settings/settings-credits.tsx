"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Coins, ShoppingCart, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SWR_KEYS } from "@/lib/swr/keys";
import { fetcher } from "@/lib/swr/fetcher";

interface CreditData {
  balance: number;
  monthlyQuota: number;
  transactions: CreditTransaction[];
}

interface CreditTransaction {
  id: string;
  type: "purchase" | "usage" | "bonus" | "refund";
  amount: number;
  description: string;
  createdAt: string;
}

const TRANSACTION_TYPE_LABEL: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  purchase: { label: "구매", variant: "default" },
  usage: { label: "사용", variant: "secondary" },
  bonus: { label: "보너스", variant: "outline" },
  refund: { label: "환불", variant: "outline" },
};

const CREDIT_PACKAGES = [
  { amount: 100, label: "100 크레딧" },
  { amount: 500, label: "500 크레딧" },
];

function CreditBar({ balance, quota }: { balance: number; quota: number }) {
  const pct = quota > 0 ? Math.min(100, Math.round((balance / quota) * 100)) : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{balance.toLocaleString()} 크레딧</span>
        <span className="text-muted-foreground">/ {quota.toLocaleString()}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className={`h-2 rounded-full transition-all ${pct <= 20 ? "bg-destructive" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function buildDailyUsage(transactions: CreditTransaction[]): { date: string; amount: number }[] {
  const now = new Date();
  const days: { date: string; amount: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({ date: d.toISOString().slice(0, 10), amount: 0 });
  }
  const dateMap = new Map(days.map((d) => [d.date, d]));

  for (const tx of transactions) {
    if (tx.amount >= 0) continue; // 충전/환불은 제외, 소비만
    const dateKey = tx.createdAt.slice(0, 10);
    const entry = dateMap.get(dateKey);
    if (entry) {
      entry.amount += Math.abs(tx.amount);
    }
  }

  return days;
}

function CreditUsageChart({ transactions }: { transactions: CreditTransaction[] }) {
  const daily = useMemo(() => buildDailyUsage(transactions), [transactions]);
  const max = Math.max(...daily.map((d) => d.amount), 1);
  const total = daily.reduce((s, d) => s + d.amount, 0);
  const labelIndices = new Set([0, 6, 13, 20, 27, 29]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">최근 30일 소비량: {total.toLocaleString()} 크레딧</p>
      </div>
      <div className="flex h-24 items-end gap-px">
        {daily.map((d, i) => {
          const h = Math.round((d.amount / max) * 100);
          return (
            <div key={d.date} className="group relative flex flex-1 flex-col items-center justify-end">
              <div
                className="w-full rounded-t-sm bg-primary/70 transition-all group-hover:bg-primary"
                style={{ height: `${Math.max(h, d.amount > 0 ? 4 : 0)}%` }}
              />
              {labelIndices.has(i) && (
                <span className="mt-1 text-[9px] text-muted-foreground">
                  {d.date.slice(5)}
                </span>
              )}
              <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background opacity-0 group-hover:opacity-100">
                {d.date.slice(5)}: {d.amount}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SettingsCredits() {
  const { data, isLoading, error } = useSWR<CreditData>(
    SWR_KEYS.billingCredits,
    fetcher,
  );
  const [purchasing, setPurchasing] = useState<number | null>(null);

  async function handlePurchase(amount: number) {
    setPurchasing(amount);
    try {
      const res = await fetch("/api/billing/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
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
      setPurchasing(null);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          크레딧 정보를 불러오지 못했습니다.
        </CardContent>
      </Card>
    );
  }

  const balance = data?.balance ?? 0;
  const quota = data?.monthlyQuota ?? 0;
  const transactions = data?.transactions ?? [];

  return (
    <div className="space-y-4">
      {/* 크레딧 잔액 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="h-4 w-4" />
            크레딧 잔액
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CreditBar balance={balance} quota={quota} />
          <p className="text-xs text-muted-foreground">
            호스티드 에이전트 작업 시 크레딧이 차감됩니다. 자체 Anthropic API 키를 등록하면 크레딧 없이도 사용할 수 있습니다.
          </p>
        </CardContent>
      </Card>

      {/* 크레딧 소비 추이 */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              크레딧 소비 추이
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CreditUsageChart transactions={transactions} />
          </CardContent>
        </Card>
      )}

      {/* 크레딧 구매 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-4 w-4" />
            크레딧 구매
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {CREDIT_PACKAGES.map((pkg) => (
              <Button
                key={pkg.amount}
                variant="outline"
                className="h-auto flex-col gap-1 py-4"
                onClick={() => handlePurchase(pkg.amount)}
                disabled={purchasing !== null}
              >
                <span className="text-lg font-bold">{pkg.label}</span>
                <span className="text-xs text-muted-foreground">
                  {purchasing === pkg.amount ? "이동 중..." : "구매하기"}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 최근 트랜잭션 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">트랜잭션 이력</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              아직 트랜잭션이 없습니다.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>유형</TableHead>
                  <TableHead>설명</TableHead>
                  <TableHead className="text-right">수량</TableHead>
                  <TableHead className="text-right">일시</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const typeConfig = TRANSACTION_TYPE_LABEL[tx.type] ?? {
                    label: tx.type,
                    variant: "secondary" as const,
                  };
                  const isPositive = tx.amount > 0;
                  return (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <Badge variant={typeConfig.variant} className="text-xs">
                          {typeConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {tx.description}
                      </TableCell>
                      <TableCell
                        className={`text-right text-sm font-medium ${isPositive ? "text-green-600" : "text-muted-foreground"}`}
                      >
                        {isPositive ? "+" : ""}{tx.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {tx.createdAt.slice(0, 10)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
