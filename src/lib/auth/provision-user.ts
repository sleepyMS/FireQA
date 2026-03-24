import { prisma } from "@/lib/db";
import { UserRole } from "@/types/enums";

/**
 * Supabase Auth 가입/OAuth 후 FireQA DB에 Organization + User를 생성한다.
 * 이미 존재하면 기존 User를 반환한다.
 */
export async function provisionUserAndOrg(params: {
  supabaseId: string;
  email: string;
  name?: string;
  orgName?: string;
}) {
  const { supabaseId, email, name, orgName } = params;

  const existing = await prisma.user.findUnique({ where: { supabaseId } });
  if (existing) return existing;

  const displayName = name || email.split("@")[0];
  const orgDisplayName = orgName || `${displayName}의 팀`;
  const baseSlug = orgDisplayName
    .toLowerCase()
    .replace(/[^a-z0-9가-힣-\s]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 30);
  const slug = `${baseSlug}-${Date.now()}`;

  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: orgDisplayName, slug },
    });

    return tx.user.create({
      data: {
        supabaseId,
        email,
        name: displayName,
        organizationId: organization.id,
        role: UserRole.OWNER,
      },
    });
  });
}
