import { prisma } from "@/lib/db";

export async function getOrgPlan(organizationId: string): Promise<string> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true },
  });
  return org?.plan ?? "free";
}
