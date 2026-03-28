import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { createHash } from "crypto";

export type AuthUser = {
  userId: string;
  organizationId: string;
  email: string;
  role: string;
};

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
          memberships: true,
        },
      },
    },
  });

  if (!apiToken) return null;
  if (apiToken.expiresAt && apiToken.expiresAt < new Date()) return null;

  prisma.apiToken
    .update({ where: { id: apiToken.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return resolveAuthUser(apiToken.user);
}

async function findUserBySupabaseId(
  supabaseId: string
): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { supabaseId },
    include: { memberships: true },
  });
  return user ? resolveAuthUser(user) : null;
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
    prisma.user
      .update({
        where: { id: user.id },
        data: { activeOrganizationId: membership.organizationId },
      })
      .catch(() => {});
  }

  return {
    userId: user.id,
    organizationId: membership.organizationId,
    role: membership.role,
    email: user.email,
  };
}
