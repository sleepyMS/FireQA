"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
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

  const handleAccept = useCallback(async () => {
    setAccepting(true);
    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        setStatus("accepted");
      } else {
        const data = await res.json();
        setError(data.error || "초대 수락에 실패했습니다.");
        setStatus("invalid");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setStatus("invalid");
    } finally {
      setAccepting(false);
    }
  }, [token]);

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
        // 로그인 필요 — sessionStorage에 토큰 저장 (로그인 후 자동 수락용)
        if (typeof window !== "undefined") {
          sessionStorage.setItem("pendingInviteToken", token!);
        }
        setStatus("login-needed");
        return;
      }

      // 로그인 상태 — 자동 수락 여부 확인 후 토큰 제거
      const pendingToken =
        typeof window !== "undefined"
          ? sessionStorage.getItem("pendingInviteToken")
          : null;
      const shouldAutoAccept = pendingToken === token;
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("pendingInviteToken");
      }

      const res = await fetch(`/api/invitations/verify?token=${token}`);
      const data = await res.json();

      if (data.valid) {
        setInfo({
          organizationName: data.organizationName,
          role: data.role,
          expiresAt: data.expiresAt,
        });
        if (shouldAutoAccept) {
          // 로그인 후 redirect로 돌아온 경우 — 자동 수락
          handleAccept();
        } else {
          setStatus("valid");
        }
      } else {
        setStatus("invalid");
        setError(data.reason || "유효하지 않은 초대입니다.");
      }
    }

    verify();
  }, [token, handleAccept]);

  const initial = info ? info.organizationName[0]?.toUpperCase() ?? "?" : "?";

  const OrgBanner = info ? (
    <div className="bg-gradient-to-br from-indigo-500 to-violet-500 px-6 py-5 text-center text-white">
      <div
        className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold text-white bg-white/20"
      >
        {initial}
      </div>
      <p className="text-base font-bold">{info.organizationName}</p>
      <p className="text-sm opacity-80">조직 초대</p>
    </div>
  ) : null;

  return (
    <Card className="w-full max-w-sm overflow-hidden">
      {status === "loading" && (
        <CardContent className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </CardContent>
      )}

      {status === "login-needed" && (
        <>
          <div className="bg-gradient-to-br from-indigo-500 to-violet-500 px-6 py-4 text-center text-white">
            <p className="text-base font-bold">조직 초대</p>
          </div>
          <CardContent className="space-y-4 pt-5">
            <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
              🔐 로그인하면 <strong>자동으로 수락</strong>됩니다. 다시 클릭할 필요 없어요.
            </div>
            <Link
              href={`/login?redirect=${encodeURIComponent(`/invite?token=${token}`)}`}
              className="block"
            >
              <Button className="w-full">로그인하여 자동 수락</Button>
            </Link>
            <Link
              href={`/signup?redirect=${encodeURIComponent(`/invite?token=${token}`)}`}
              className="block"
            >
              <Button variant="outline" className="w-full">
                회원가입 후 수락
              </Button>
            </Link>
          </CardContent>
        </>
      )}

      {status === "valid" && info && (
        <>
          {OrgBanner}
          <CardContent className="space-y-4 pt-5">
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">역할</span>
                <Badge variant="secondary">
                  {ROLE_LABEL[info.role] ?? info.role}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">만료</span>
                <span>{new Date(info.expiresAt).toLocaleString("ko-KR")}</span>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleAccept}
              disabled={accepting}
            >
              {accepting ? "수락 중..." : `${info.organizationName} 합류하기`}
            </Button>
          </CardContent>
        </>
      )}

      {status === "accepted" && (
        <CardContent className="space-y-4 py-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
            🎉
          </div>
          <div>
            <p className="text-base font-bold">
              {info?.organizationName ?? "조직"}에 합류했습니다!
            </p>
            <p className="mt-1 text-sm text-muted-foreground">멤버로 추가되었습니다</p>
          </div>
          <Link href="/">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
              대시보드로 이동 →
            </Button>
          </Link>
        </CardContent>
      )}

      {status === "invalid" && (
        <CardContent className="space-y-4 py-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl">
            ⏰
          </div>
          <div>
            <p className="text-sm font-semibold text-destructive">{error}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              조직 관리자에게 새 초대 링크를 요청하세요
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" className="w-full">
              홈으로 돌아가기
            </Button>
          </Link>
        </CardContent>
      )}
    </Card>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <Card className="w-full max-w-sm">
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
