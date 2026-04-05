import { NextRequest, NextResponse } from "next/server";

/** CRON_SECRET 환경변수로 크론잡 요청을 인증. 인증 실패 시 401 응답 반환, 성공 시 null. */
export function verifyCronSecret(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return null;
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
