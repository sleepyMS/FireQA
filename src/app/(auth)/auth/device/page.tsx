"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function DeviceAuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code");

  const [status, setStatus] = useState<"loading" | "confirm" | "success" | "error">("loading");
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setStatus("error");
      setError("인증 코드가 없습니다.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace(
          `/login?redirect=${encodeURIComponent(`/auth/device?code=${code}`)}`
        );
        return;
      }

      const displayName =
        (data.user.user_metadata?.full_name as string | undefined) ||
        data.user.email ||
        null;
      setCurrentUser(displayName);

      fetch(`/api/auth/device?code=${code}`)
        .then((res) => {
          if (res.ok || res.status === 202) {
            setStatus("confirm");
          } else {
            setStatus("error");
            setError("유효하지 않거나 만료된 인증 코드입니다.");
          }
        })
        .catch(() => {
          setStatus("error");
          setError("서버에 연결할 수 없습니다.");
        });
    });
  }, [code, router]);

  async function handleApprove() {
    setStatus("loading");
    const res = await fetch("/api/auth/device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, action: "approve" }),
    });

    if (res.ok) {
      setStatus("success");
    } else {
      const body = await res.json();
      setStatus("error");
      setError(body.error || "승인에 실패했습니다.");
    }
  }

  return (
    <div className="rounded-xl border bg-white p-8 shadow-sm text-center">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">FireQA</h1>
        <p className="mt-1 text-sm text-gray-500">Figma 플러그인 연결</p>
      </div>

      {status === "loading" && (
        <p className="text-gray-500">확인 중...</p>
      )}

      {status === "confirm" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Figma 플러그인에서 FireQA 계정 연결을 요청했습니다.
          </p>
          {currentUser && (
            <p className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">{currentUser}</span> 계정으로 연결합니다
            </p>
          )}
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-xs text-gray-500">인증 코드</p>
            <p className="font-mono text-lg font-bold tracking-widest">{code?.slice(0, 8)}...</p>
          </div>
          <button
            onClick={handleApprove}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            플러그인 연결 승인
          </button>
          <p className="text-xs text-gray-400">
            본인이 요청하지 않았다면 이 페이지를 닫으세요.
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-base font-semibold text-gray-900">연결 완료!</p>
          <p className="text-sm text-gray-500">Figma 플러그인으로 돌아가세요.<br />이 페이지를 닫아도 됩니다.</p>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}

export default function DeviceAuthPage() {
  return (
    <Suspense fallback={<p className="text-center text-gray-500">로딩 중...</p>}>
      <DeviceAuthContent />
    </Suspense>
  );
}
