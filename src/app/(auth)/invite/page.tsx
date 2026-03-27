"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ROLE_LABEL } from "@/types/enums";

function InviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<
    "loading" | "valid" | "invalid" | "accepted" | "login-needed"
  >("loading");
  const [info, setInfo] = useState<{
    organizationName: string;
    role: string;
    expiresAt: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      setError("초대 토큰이 없습니다.");
      return;
    }

    async function verify() {
      const supabase = createSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        setStatus("login-needed");
        return;
      }

      const res = await fetch(`/api/invitations/verify?token=${token}`);
      const data = await res.json();

      if (data.valid) {
        setInfo({
          organizationName: data.organizationName,
          role: data.role,
          expiresAt: data.expiresAt,
        });
        setStatus("valid");
      } else {
        setStatus("invalid");
        setError(data.reason || "유효하지 않은 초대입니다.");
      }
    }

    verify();
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    const res = await fetch("/api/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setAccepting(false);
    if (res.ok) {
      setStatus("accepted");
    } else {
      const data = await res.json();
      setError(data.error || "초대 수락에 실패했습니다.");
      setStatus("invalid");
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>조직 초대</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "loading" && (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}

        {status === "login-needed" && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              초대를 수락하려면 로그인이 필요합니다.
            </p>
            <Link
              href={`/login?redirect=${encodeURIComponent(`/invite?token=${token}`)}`}
            >
              <Button className="w-full">로그인하여 수락</Button>
            </Link>
          </div>
        )}

        {status === "valid" && info && (
          <div className="space-y-4">
            <div className="space-y-2 rounded-lg border p-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">조직</span>
                <span className="text-sm font-medium">
                  {info.organizationName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">역할</span>
                <Badge variant="secondary">
                  {ROLE_LABEL[info.role] ?? info.role}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">만료</span>
                <span className="text-sm">
                  {new Date(info.expiresAt).toLocaleString("ko-KR")}
                </span>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleAccept}
              disabled={accepting}
            >
              {accepting ? "수락 중..." : "수락하기"}
            </Button>
          </div>
        )}

        {status === "accepted" && (
          <div className="space-y-4 text-center">
            <p className="text-lg font-medium">조직에 합류했습니다!</p>
            <Link href="/dashboard">
              <Button className="w-full">대시보드로 이동</Button>
            </Link>
          </div>
        )}

        {status === "invalid" && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">
                대시보드로 이동
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardContent className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </CardContent>
        </Card>
      }
    >
      <InviteContent />
    </Suspense>
  );
}
