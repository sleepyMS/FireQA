"use client";

import { useState, Suspense } from "react";
import { useLocale } from "@/lib/i18n/locale-provider";
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

// 탭 nav + 콘텐츠를 client state로 통합 — 탭 전환 시 서버 재요청 없음
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
    <>
      <div className="flex gap-1 border-b">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Suspense fallback={tabFallback}>
        {activeTab === "general" ? <SettingsGeneral />
          : activeTab === "members" ? <SettingsMembers />
          : activeTab === "billing" ? <SettingsBilling />
          : <SettingsWebhooks />}
      </Suspense>
    </>
  );
}
