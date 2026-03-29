import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { createHash } from "crypto";
import { createTTLCache } from "@/lib/cache/ttl-cache";

export type AuthUser = {
  userId: string;
  organizationId: string;
  email: string;
  name: string | null;
  role: string;
};

// AuthUser와 달리 멤버십 전체를 보관해 조직 전환 시 캐시 내에서 해결
type CachedUser = {
  id: string;
  email: string;
  name: string | null;
  activeOrganizationId: string | null;
  memberships: { organizationId: string; role: string }[];
};

const userDataCache = createTTLCache<CachedUser>(60_000);
// prisma userId → supabaseId 역방향 맵: API 라우트에서 supabaseId 없이 캐시에 접근하기 위해 유지
const prismaIdToSupabaseId = new Map<string, string>();

// 조직 전환 시 activeOrganizationId만 교체 (DB 재조회 없음)
export function updateCachedActiveOrg(userId: string, organizationId: string) {
  const supabaseId = prismaIdToSupabaseId.get(userId);
  if (!supabaseId) return;
  const cached = userDataCache.get(supabaseId);
  if (!cached) return;
  userDataCache.set(supabaseId, { ...cached, activeOrganizationId: organizationId });
}

// 새 조직 생성 시 멤버십 추가 + activeOrganizationId 업데이트 (DB 재조회 없음)
export function updateCachedNewOrg(userId: string, organizationId: string, role: string) {
  const supabaseId = prismaIdToSupabaseId.get(userId);
  if (!supabaseId) return;
  const cached = userDataCache.get(supabaseId);
  if (!cached) return;
  userDataCache.set(supabaseId, {
    ...cached,
    activeOrganizationId: organizationId,
    memberships: [...cached.memberships, { organizationId, role }],
  });
}

export async function getCurrentUser(
  request?: Request
): Promise<AuthUser | null> {
  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      return authenticateByToken(authHeader.slice(7));
    }
  }

  return authenticateBySession();
}

async function authenticateByToken(token: string): Promise<AuthUser | null> {
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const apiToken = await prisma.apiToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          memberships: { select: { organizationId: true, role: true } },
        },
      },
    },
  });

  if (!apiToken) return null;
  if (apiToken.expiresAt && apiToken.expiresAt < new Date()) return null;

  // 5분 이상 경과한 경우에만 lastUsedAt 갱신 (DB 쓰기 스로틀)
  const lastUsed = apiToken.lastUsedAt;
  if (!lastUsed || Date.now() - lastUsed.getTime() > 5 * 60_000) {
    prisma.apiToken
      .update({ where: { id: apiToken.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});
  }

  return resolveAuthUser(apiToken.user);
}

async function findUserBySupabaseId(
  supabaseId: string
): Promise<AuthUser | null> {
  const cached = userDataCache.get(supabaseId);
  if (cached) {
    // 역방향 맵이 만료된 경우 복원
    prismaIdToSupabaseId.set(cached.id, supabaseId);
    return resolveAuthUser(cached);
  }

  const user = await prisma.user.findUnique({
    where: { supabaseId },
    include: { memberships: { select: { organizationId: true, role: true } } },
  });
  if (!user) return null;

  prismaIdToSupabaseId.set(user.id, supabaseId);
  userDataCache.set(supabaseId, user);
  return resolveAuthUser(user);
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

type UserWithMemberships = {
  id: string;
  email: string;
  name: string | null;
  activeOrganizationId: string | null;
  memberships: { organizationId: string; role: string }[];
};

async function resolveAuthUser(
  user: UserWithMemberships
): Promise<AuthUser | null> {
  if (user.memberships.length === 0) return null;

  let membership = user.memberships.find(
    (m) => m.organizationId === user.activeOrganizationId
  );

  // activeOrganizationId가 stale하거나 없을 때 첫 번째 멤버십으로 폴백
  if (!membership) {
    membership = user.memberships[0];
    const correctedOrgId = membership.organizationId;
    prisma.user
      .update({
        where: { id: user.id },
        data: { activeOrganizationId: correctedOrgId },
      })
      .catch(() => {});
    // 캐시도 함께 교정
    const supabaseId = prismaIdToSupabaseId.get(user.id);
    if (supabaseId) {
      const cachedEntry = userDataCache.get(supabaseId);
      if (cachedEntry) {
        userDataCache.set(supabaseId, { ...cachedEntry, activeOrganizationId: correctedOrgId });
      }
    }
  }

  return {
    userId: user.id,
    organizationId: membership.organizationId,
    role: membership.role,
    email: user.email,
    name: user.name,
  };
}
