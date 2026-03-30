import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/db";

/**
 * Supabase OAuth 콜백 처리.
 * 세션을 쿠키에 설정하고, 기존 유저면 대시보드로, 신규 유저면 온보딩으로 이동.
 * 콜백 route는 response 객체에 직접 쿠키를 설정해야 하므로 공유 헬퍼 대신 인라인 생성.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next"); // 비밀번호 재설정 등 특수 목적지
  // redirect 목적지는 쿠키에서 읽음 (URL 쿼리 파라미터로 전달 시 Supabase 허용 목록 매칭 실패)
  const redirectCookie = request.cookies.get("auth_redirect")?.value;
  const redirect = next ?? (redirectCookie ? decodeURIComponent(redirectCookie) : "/");

  if (!code) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.redirect(new URL(redirect, request.url));
  response.cookies.delete("auth_redirect");

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(
      new URL("/login?error=auth_failed", request.url)
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { supabaseId: data.user.id },
    select: { id: true },
  });

  if (existingUser) {
    return response;
  }

  // 신규 OAuth 유저 → 온보딩으로
  const onboardingUrl = new URL("/onboarding", request.url);
  onboardingUrl.searchParams.set(
    "redirect",
    new URL(redirect, request.url).pathname
  );
  return NextResponse.redirect(onboardingUrl);
}
