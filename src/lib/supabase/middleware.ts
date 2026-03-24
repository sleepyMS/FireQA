import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

/**
 * Supabase 세션 리프레시를 위한 미들웨어 헬퍼.
 * 만료된 세션 쿠키를 자동으로 갱신하고, 인증 상태를 반환한다.
 */
export async function updateSupabaseSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 요청 쿠키에 반영 (Server Component에서 읽을 수 있도록)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // 응답 쿠키에 반영 (브라우저에 전달)
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser()로 세션 유효성 검증 (서버에 확인, 스푸핑 방지)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
