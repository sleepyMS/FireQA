"use client";

import useSWR from "swr";
import { toast } from "sonner";

export type AIConfigData = {
  executionMode: "server" | "agent";
  serverModel: string;
  agentConnectionId: string | null;
  agentModel: string | null;
  agentConnection: {
    id: string;
    name: string;
    status: string;
    metadata: { cli?: string; os?: string; version?: string };
  } | null;
};

const DEFAULTS: AIConfigData = {
  executionMode: "server",
  serverModel: "gpt-4.1-mini",
  agentConnectionId: null,
  agentModel: null,
  agentConnection: null,
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useAIConfig() {
  const { data, error, isLoading, mutate } = useSWR<AIConfigData>(
    "/api/ai-config",
    fetcher,
    { revalidateOnFocus: true, refreshInterval: 15_000 }
  );

  const config = data ?? DEFAULTS;

  const save = async (updates: Partial<Omit<AIConfigData, "agentConnection">>): Promise<boolean> => {
    const payload = { ...config, ...updates };
    try {
      const res = await fetch("/api/ai-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error ?? "설정 저장에 실패했습니다.");
        return false;
      }
      await mutate(result, false);
      toast.success("AI 설정이 저장되었습니다.");
      return true;
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
      return false;
    }
  };

  return { config, isLoading, error, save, mutate };
}
