import { Suspense } from "react";
import SettingsGeneral from "./settings-general";
import SettingsMembers from "./settings-members";
import SettingsBilling from "./settings-billing";
import SettingsWebhooks from "./settings-webhooks";
import { SettingsTabs } from "./settings-tabs";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab =
    tab === "members" ? "members"
    : tab === "billing" ? "billing"
    : tab === "webhooks" ? "webhooks"
    : "general";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">설정</h2>
        <p className="text-muted-foreground">조직 설정을 관리합니다.</p>
      </div>

      <SettingsTabs activeTab={activeTab} />

      <Suspense
        fallback={
          <div className="flex justify-center py-20 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        }
      >
        {activeTab === "general" ? (
          <SettingsGeneral />
        ) : activeTab === "members" ? (
          <SettingsMembers />
        ) : activeTab === "billing" ? (
          <SettingsBilling />
        ) : (
          <SettingsWebhooks />
        )}
      </Suspense>
    </div>
  );
}
