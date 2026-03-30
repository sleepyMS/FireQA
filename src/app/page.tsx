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
  // encodeURIComponent: DB에 잘못된 슬러그가 있어도 location 헤더 ERR_INVALID_CHAR 방지
  redirect(`/${encodeURIComponent(org.slug)}/dashboard`);
}
