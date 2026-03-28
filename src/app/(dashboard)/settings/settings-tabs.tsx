"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/locale-provider";

const TAB_HREFS = {
  general: "/settings",
  members: "/settings?tab=members",
  billing: "/settings?tab=billing",
  webhooks: "/settings?tab=webhooks",
} as const;

type TabKey = keyof typeof TAB_HREFS;

export function SettingsTabs({ activeTab }: { activeTab: TabKey }) {
  const { t } = useLocale();

  const tabs: { key: TabKey; label: string }[] = [
    { key: "general", label: t.settings.tabs.general },
    { key: "members", label: t.settings.tabs.members },
    { key: "billing", label: t.settings.tabs.billing },
    { key: "webhooks", label: t.settings.tabs.webhooks },
  ];

  return (
    <div className="flex gap-1 border-b">
      {tabs.map(({ key, label }) => (
        <Link
          key={key}
          href={TAB_HREFS[key]}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === key
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
