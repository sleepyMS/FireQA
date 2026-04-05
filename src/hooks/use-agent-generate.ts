"use client";

import { useState } from "react";

type AgentGenerateState = {
  isSubmitting: boolean;
  jobId: string | null;
  agentTaskId: string | null;
  error: string | null;
  isAgentOffline: boolean;
};

export function useAgentGenerate(url: string) {
  const [state, setState] = useState<AgentGenerateState>({
    isSubmitting: false,
    jobId: null,
    agentTaskId: null,
    error: null,
    isAgentOffline: false,
  });

  const submit = async (formData: FormData): Promise<{ jobId: string } | null> => {
    setState({ isSubmitting: true, jobId: null, agentTaskId: null, error: null, isAgentOffline: false });
    formData.set("executionMode", "agent");

    try {
      const res = await fetch(url, { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        const isAgentOffline = res.status === 409;
        const msg = isAgentOffline
          ? "연결된 에이전트가 없습니다."
          : (data.error ?? "에이전트 작업 생성에 실패했습니다.");
        setState((prev) => ({ ...prev, isSubmitting: false, error: msg, isAgentOffline }));
        return null;
      }

      setState({ isSubmitting: false, jobId: data.jobId, agentTaskId: data.agentTaskId, error: null, isAgentOffline: false });
      return { jobId: data.jobId };
    } catch {
      setState((prev) => ({ ...prev, isSubmitting: false, error: "요청에 실패했습니다.", isAgentOffline: false }));
      return null;
    }
  };

  return { ...state, submit };
}
