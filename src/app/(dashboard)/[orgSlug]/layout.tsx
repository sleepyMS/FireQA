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

  // org 조회 + 멤버십 확인을 단일 쿼리로 (순차 2회 → JOIN 1회)
  const membership = await prisma.organizationMembership.findFirst({
    where: { userId: user.userId, organization: { slug: orgSlug } },
    select: { organizationId: true },
  });

  if (!membership) {
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true },
    });
    if (!org) notFound();
    // org는 있지만 멤버가 아님 → 활성 org로 리다이렉트
    const activeOrg = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { slug: true },
    });
    if (!activeOrg) redirect("/onboarding");
    redirect(`/${encodeURIComponent(activeOrg.slug)}/dashboard`);
  }

  const orgId = membership.organizationId;

  // URL의 org와 세션 org가 다르면 세션 동기화 (fire-and-forget, 렌더링 블록 없음)
  if (user.organizationId !== orgId) {
    prisma.user
      .update({ where: { id: user.userId }, data: { activeOrganizationId: orgId } })
      .catch(() => {});
    updateCachedActiveOrg(user.userId, orgId);
  }

  return <>{children}</>;
}
