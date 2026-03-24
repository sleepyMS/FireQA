import { NextRequest, NextResponse } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/login", "/signup", "/auth/callback", "/auth/device"];

// 환경변수는 런타임에 변경되지 않으므로 모듈 레벨에서 1회 파싱
const allowedOrigins = (() => {
  const origins =
    process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) ?? [];
  if (process.env.NODE_ENV === "development") {
    origins.push("http://localhost:3000");
  }
  return origins;
})();

function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get("origin");
  const hasAuthHeader = request.headers.has("authorization");
  // Figma 플러그인은 샌드박스 iframe에서 Origin: null로 요청 → Bearer 토큰 있을 때만 허용
  const isAllowed =
    (origin && allowedOrigins.includes(origin)) ||
    (origin === "null" && hasAuthHeader);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin || "*" : "",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function addCorsHeaders(
  response: NextResponse,
  request: NextRequest
): NextResponse {
  const corsHeaders = getCorsHeaders(request);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    if (value) response.headers.set(key, value);
  });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── API 라우트 ───
  if (pathname.startsWith("/api/")) {
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: getCorsHeaders(request),
      });
    }

    // Bearer 토큰 요청(Figma 플러그인)은 Supabase 세션 불필요 → 바로 통과
    if (request.headers.get("authorization")?.startsWith("Bearer ")) {
      return addCorsHeaders(NextResponse.next({ request }), request);
    }

    // 세션 쿠키 요청: 세션 리프레시 + 인증된 supabaseId를 헤더로 전달
    const { supabaseResponse, user } = await updateSupabaseSession(request);
    if (user) {
      supabaseResponse.headers.set("x-supabase-user-id", user.id);
    }
    return addCorsHeaders(supabaseResponse, request);
  }

  // ─── 페이지 라우트 ───
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const { supabaseResponse, user } = await updateSupabaseSession(request);

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
