import Link from "next/link";
import { Suspense } from "react";
import SettingsGeneral from "./settings-general";
import SettingsMembers from "./settings-members";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "members" ? "members" : "general";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">설정</h2>
        <p className="text-muted-foreground">조직 설정을 관리합니다.</p>
      </div>

      <div className="flex gap-1 border-b">
        <Link
          href="/settings"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "general"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          일반
        </Link>
        <Link
          href="/settings?tab=members"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "members"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          멤버
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center py-20 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        }
      >
        {activeTab === "general" ? <SettingsGeneral /> : <SettingsMembers />}
      </Suspense>
    </div>
  );
}
