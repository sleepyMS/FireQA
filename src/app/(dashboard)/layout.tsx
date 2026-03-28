import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { UserProvider } from "@/lib/auth/user-provider";
import { prisma } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/onboarding");

  // OrgSwitcher fallbackData: 서버에서 직접 조회하여 클라이언트 API 왕복 제거
  const [dbUser, rawMemberships] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.userId },
      select: { activeOrganizationId: true },
    }),
    prisma.organizationMembership.findMany({
      where: { userId: user.userId },
      include: { organization: { select: { id: true, name: true, slug: true } } },
      orderBy: { joinedAt: "asc" },
    }),
  ]);

  const initialMemberships = rawMemberships.map((m) => ({
    organizationId: m.organizationId,
    name: m.organization.name,
    slug: m.organization.slug,
    role: m.role,
  }));

  return (
    <UserProvider value={user}>
      <div className="flex h-full min-h-screen">
        <Sidebar
          initialMemberships={initialMemberships}
          initialActiveOrgId={dbUser?.activeOrganizationId ?? null}
        />
        <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
          <Header />
          <main className="min-w-0 flex-1 overflow-hidden p-6">{children}</main>
        </div>
      </div>
    </UserProvider>
  );
}
