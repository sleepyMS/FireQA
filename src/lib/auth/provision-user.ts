import { prisma } from "@/lib/db";
import { UserRole } from "@/types/enums";

// 조직 이름 → URL 안전 slug (예: "Acme Team QA" → "acme-team-qa")
export function generateOrgSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "team"
  );
}

// DB 중복 확인 후 고유 slug 반환 (예: acme-team, acme-team-2, acme-team-3, ...)
export async function generateUniqueOrgSlug(name: string): Promise<string> {
  const base = generateOrgSlug(name);
  let slug = base;
  let suffix = 2;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix}`;
    suffix++;
  }
  return slug;
}

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
  const slug = await generateUniqueOrgSlug(orgDisplayName);

  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: orgDisplayName, slug },
    });

    const user = await tx.user.create({
      data: {
        supabaseId,
        email,
        name: displayName,
        activeOrganizationId: organization.id,
      },
    });

    await tx.organizationMembership.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: UserRole.OWNER,
      },
    });

    return user;
  });
}
