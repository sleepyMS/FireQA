"use client";

import { useState, Suspense } from "react";
import { useLocale } from "@/lib/i18n/locale-provider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SettingsGeneral from "./settings-general";
import SettingsMembers from "./settings-members";
import SettingsBilling from "./settings-billing";
import SettingsWebhooks from "./settings-webhooks";

type TabKey = "general" | "members" | "billing" | "webhooks";

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
  ];

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
      <TabsList variant="line">
        {tabs.map(({ key, label }) => (
          <TabsTrigger key={key} value={key}>
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map(({ key }) => (
        <TabsContent key={key} value={key}>
          <Suspense fallback={tabFallback}>
            {key === "general" ? <SettingsGeneral />
              : key === "members" ? <SettingsMembers />
              : key === "billing" ? <SettingsBilling />
              : <SettingsWebhooks />}
          </Suspense>
        </TabsContent>
      ))}
    </Tabs>
  );
}
