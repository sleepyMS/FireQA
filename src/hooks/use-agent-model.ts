"use client";
import { useState, useEffect } from "react";

export const AGENT_MODEL_OPTIONS = {
  claude: [
    { value: "claude-sonnet-4-6", label: "Sonnet 4.6", desc: "기본값" },
    { value: "claude-opus-4-6", label: "Opus 4.6", desc: "최고 성능" },
    { value: "claude-haiku-4-5", label: "Haiku 4.5", desc: "빠름" },
  ],
  codex: [
    { value: "gpt-5.4", label: "GPT-5.4", desc: "기본값" },
    { value: "gpt-5.3-codex", label: "GPT-5.3 Codex", desc: "코딩 특화" },
    { value: "gpt-5.4-mini", label: "GPT-5.4 Mini", desc: "빠름" },
  ],
  gemini: [
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", desc: "기본값" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", desc: "고성능" },
    { value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", desc: "최신 프리뷰" },
  ],
} as const;

const STORAGE_KEY = "fireqa:agentModel";
const DEFAULT = "claude-sonnet-4-6";

export function useAgentModel() {
  const [agentModel, setAgentModelState] = useState<string>(DEFAULT);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setAgentModelState(saved);
  }, []);

  const setAgentModel = (value: string) => {
    setAgentModelState(value);
    localStorage.setItem(STORAGE_KEY, value);
  };

  return { agentModel, setAgentModel };
}
