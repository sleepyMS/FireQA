import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { createHash } from "crypto";

export type AuthUser = {
  userId: string;
  organizationId: string;
  email: string;
  role: string;
};

/**
 * 현재 인증된 사용자 정보를 반환한다.
 * Bearer 토큰 → 미들웨어가 전달한 supabaseId 헤더 → Supabase 세션 순으로 확인.
 */
export async function getCurrentUser(
  request?: Request
): Promise<AuthUser | null> {
  if (request) {
    // 1) Bearer 토큰 (Figma 플러그인 등)
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      return authenticateByToken(authHeader.slice(7));
    }

    // 2) 미들웨어가 이미 검증한 supabaseId (getUser() 이중 호출 방지)
    const supabaseUserId = request.headers.get("x-supabase-user-id");
    if (supabaseUserId) {
      return findUserBySupabaseId(supabaseUserId);
    }
  }

  // 3) 폴백: Supabase 세션 쿠키로 직접 확인
  return authenticateBySession();
}

async function authenticateByToken(token: string): Promise<AuthUser | null> {
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const apiToken = await prisma.apiToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!apiToken) return null;
  if (apiToken.expiresAt && apiToken.expiresAt < new Date()) return null;

  // lastUsedAt 업데이트 (fire-and-forget)
  prisma.apiToken
    .update({ where: { id: apiToken.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return toAuthUser(apiToken.user);
}

async function findUserBySupabaseId(
  supabaseId: string
): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({ where: { supabaseId } });
  return user ? toAuthUser(user) : null;
}

async function authenticateBySession(): Promise<AuthUser | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    if (!supabaseUser) return null;
    return findUserBySupabaseId(supabaseUser.id);
  } catch {
    return null;
  }
}

function toAuthUser(user: {
  id: string;
  organizationId: string;
  email: string;
  role: string;
}): AuthUser {
  return {
    userId: user.id,
    organizationId: user.organizationId,
    email: user.email,
    role: user.role,
  };
}
