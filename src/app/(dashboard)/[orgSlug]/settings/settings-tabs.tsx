"use client";

import { useState, Suspense } from "react";
import { useLocale } from "@/lib/i18n/locale-provider";
import { TabNav } from "@/components/ui/tab-nav";
import SettingsGeneral from "./settings-general";
import SettingsMembers from "./settings-members";
import SettingsBilling from "./settings-billing";
import SettingsWebhooks from "./settings-webhooks";
import SettingsApiKeys from "./settings-api-keys";
import SettingsAgent from "./settings-agent";
// Phase 4.5: Anthropic 키 관리 및 크레딧 탭 추가
import SettingsAnthropicKey from "./settings-anthropic-key";
import SettingsCredits from "./settings-credits";

type TabKey =
  | "general"
  | "members"
  | "billing"
  | "credits"
  | "webhooks"
  | "api-keys"
  | "anthropic-key"
  | "agent";

const tabFallback = (
  <div className="flex justify-center py-20 text-muted-foreground">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

export function SettingsTabs({ activeTab: initialTab }: { activeTab: TabKey }) {
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "general", label: t.settings.tabs.general },
    { key: "members", label: t.settings.tabs.members },
    { key: "billing", label: t.settings.tabs.billing },
    { key: "credits", label: "크레딧" },
    { key: "webhooks", label: t.settings.tabs.webhooks },
    { key: "api-keys", label: "API 키" },
    { key: "anthropic-key", label: "Anthropic 키" },
    { key: "agent", label: "에이전트" },
  ];

  return (
    <>
      <TabNav
        tabs={tabs.map(({ key, label }) => ({ value: key, label }))}
        value={activeTab}
        onValueChange={setActiveTab}
      />

      <Suspense fallback={tabFallback}>
        {activeTab === "general" ? <SettingsGeneral />
          : activeTab === "members" ? <SettingsMembers />
          : activeTab === "billing" ? <SettingsBilling />
          : activeTab === "credits" ? <SettingsCredits />
          : activeTab === "webhooks" ? <SettingsWebhooks />
          : activeTab === "api-keys" ? <SettingsApiKeys />
          : activeTab === "anthropic-key" ? <SettingsAnthropicKey />
          : <SettingsAgent />}
      </Suspense>
    </>
  );
}
