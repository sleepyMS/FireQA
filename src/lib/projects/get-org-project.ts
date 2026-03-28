import { prisma } from "@/lib/db";

export async function getOrgProject(id: string, organizationId: string) {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.organizationId !== organizationId) return null;
  return project;
}
