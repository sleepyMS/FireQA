import { getCurrentUser } from "@/lib/auth/get-current-user";
import { hasRole } from "@/lib/auth/require-role";
import { UserRole } from "@/types/enums";
import { redirect } from "next/navigation";
import { AdminClient } from "./admin-client";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const user = await getCurrentUser();

  if (!user || !hasRole(user.role, UserRole.ADMIN)) {
    redirect(`/${orgSlug}/dashboard`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">관리자</h2>
        <p className="text-muted-foreground">조직 현황을 한눈에 확인하고 멤버를 관리합니다.</p>
      </div>
      <AdminClient orgSlug={orgSlug} />
    </div>
  );
}
