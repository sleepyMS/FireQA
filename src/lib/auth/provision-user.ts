import { prisma } from "@/lib/db";
import { UserRole } from "@/types/enums";

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
  const baseSlug = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30) || "team";
  const slug = `${baseSlug}-${Date.now()}`;

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
