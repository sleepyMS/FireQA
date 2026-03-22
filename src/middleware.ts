import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // API 라우트에만 CORS 헤더 추가
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // Preflight OPTIONS 요청 처리
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // 일반 요청에 CORS 헤더 추가
    const response = NextResponse.next();
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, DELETE, OPTIONS"
    );
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
