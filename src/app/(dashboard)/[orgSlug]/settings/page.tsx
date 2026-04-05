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
    : tab === "credits" ? "credits"
    : tab === "webhooks" ? "webhooks"
    : tab === "api-keys" ? "api-keys"
    : tab === "agent" ? "agent"
    : "general";

  return (
    <div className="space-y-6">
      <SettingsTabs activeTab={activeTab} />
    </div>
  );
}
