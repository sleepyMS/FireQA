"use client";

import { useState, Suspense } from "react";
import { useLocale } from "@/lib/i18n/locale-provider";
import { TabNav } from "@/components/ui/tab-nav";
import SettingsGeneral from "./settings-general";
import SettingsMembers from "./settings-members";
import SettingsBilling from "./settings-billing";
import SettingsWebhooks from "./settings-webhooks";
import SettingsApiKeys from "./settings-api-keys";

type TabKey = "general" | "members" | "billing" | "webhooks" | "api-keys";

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
    { key: "webhooks", label: t.settings.tabs.webhooks },
    { key: "api-keys", label: "API 키" },
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
          : activeTab === "webhooks" ? <SettingsWebhooks />
          : <SettingsApiKeys />}
      </Suspense>
    </>
  );
}
