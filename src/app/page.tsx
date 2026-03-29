import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/db";

export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/onboarding");

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { slug: true },
  });

  if (!org) redirect("/onboarding");
  redirect(`/${org.slug}/dashboard`);
}
