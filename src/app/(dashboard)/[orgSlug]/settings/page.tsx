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
    : tab === "api-keys" ? "api-keys"
    : "general";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">설정</h2>
        <p className="text-muted-foreground">조직 설정을 관리합니다.</p>
      </div>

      {/* SettingsTabs가 탭 nav + 콘텐츠 렌더링 모두 담당 */}
      <SettingsTabs activeTab={activeTab} />
    </div>
  );
}
