import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { provisionUserAndOrg } from "@/lib/auth/provision-user";

/**
 * Supabase OAuth 콜백 처리.
 * 세션을 쿠키에 설정하고, FireQA DB에 User/Organization이 없으면 자동 생성.
 * 콜백 route는 response 객체에 직접 쿠키를 설정해야 하므로 공유 헬퍼 대신 인라인 생성.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") || "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.redirect(new URL(redirect, request.url));

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

  const email = data.user.email || "";
  const name =
    data.user.user_metadata?.full_name ||
    data.user.user_metadata?.name ||
    email.split("@")[0];

  await provisionUserAndOrg({ supabaseId: data.user.id, email, name });

  return response;
}
