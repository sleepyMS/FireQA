"use client";

import { useState } from "react";

type AgentGenerateState = {
  isSubmitting: boolean;
  jobId: string | null;
  agentTaskId: string | null;
  error: string | null;
};

export function useAgentGenerate(url: string) {
  const [state, setState] = useState<AgentGenerateState>({
    isSubmitting: false,
    jobId: null,
    agentTaskId: null,
    error: null,
  });

  const submit = async (formData: FormData): Promise<{ jobId: string } | null> => {
    setState({ isSubmitting: true, jobId: null, agentTaskId: null, error: null });
    formData.set("executionMode", "agent");

    try {
      const res = await fetch(url, { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        const msg = data.error ?? "에이전트 작업 생성에 실패했습니다.";
        setState((prev) => ({ ...prev, isSubmitting: false, error: msg }));
        return null;
      }

      setState({
        isSubmitting: false,
        jobId: data.jobId,
        agentTaskId: data.agentTaskId,
        error: null,
      });
      return { jobId: data.jobId };
    } catch {
      setState((prev) => ({ ...prev, isSubmitting: false, error: "요청에 실패했습니다." }));
      return null;
    }
  };

  const reset = () => setState({ isSubmitting: false, jobId: null, agentTaskId: null, error: null });

  return { ...state, submit, reset };
}
