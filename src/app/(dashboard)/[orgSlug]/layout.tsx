import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, updateCachedActiveOrg } from "@/lib/auth/get-current-user";

type OrgLayoutProps = {
  params: Promise<{ orgSlug: string }>;
  children: React.ReactNode;
};

export default async function OrgLayout({ params, children }: OrgLayoutProps) {
  const [{ orgSlug }, user] = await Promise.all([params, getCurrentUser()]);

  if (!user) redirect("/onboarding");

  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true },
  });

  if (!org) notFound();

  const membership = await prisma.organizationMembership.findUnique({
    where: {
      userId_organizationId: { userId: user.userId, organizationId: org.id },
    },
  });

  if (!membership) {
    // 이 org의 멤버가 아님 → 현재 활성 org로 리다이렉트
    const activeOrg = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { slug: true },
    });
    if (!activeOrg) redirect("/onboarding");
    redirect(`/${activeOrg.slug}/dashboard`);
  }

  // URL의 org와 세션 org가 다르면 세션 동기화 (org 전환 감지)
  if (user.organizationId !== org.id) {
    await prisma.user.update({
      where: { id: user.userId },
      data: { activeOrganizationId: org.id },
    });
    updateCachedActiveOrg(user.userId, org.id);
  }

  return <>{children}</>;
}
