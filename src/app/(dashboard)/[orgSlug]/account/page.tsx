"use client";

import { useState } from "react";
import { TabNav } from "@/components/ui/tab-nav";
import AccountAI from "./account-ai";
import AccountDanger from "./account-danger";
import AccountChatTest from "./account-chat-test";

type TabKey = "ai" | "chat" | "account";

const TABS: { key: TabKey; label: string }[] = [
  { key: "ai", label: "AI 실행 방식" },
  { key: "chat", label: "채팅 테스트" },
  { key: "account", label: "계정" },
];

export default function AccountPage() {
  const [tab, setTab] = useState<TabKey>("ai");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">계정 설정</h2>
        <p className="text-muted-foreground">AI 실행 방식 및 계정 관리</p>
      </div>

      <TabNav
        tabs={TABS.map(({ key, label }) => ({ value: key, label }))}
        value={tab}
        onValueChange={setTab}
      />

      {tab === "ai" ? <AccountAI /> : tab === "chat" ? <AccountChatTest /> : <AccountDanger />}
    </div>
  );
}
