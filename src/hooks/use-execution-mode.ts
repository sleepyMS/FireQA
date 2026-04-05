"use client";
import { useState } from "react";

export type ExecutionMode = "server" | "agent";
const STORAGE_KEY = "fireqa:executionMode";

export function useExecutionMode() {
  const [executionMode, setExecutionModeState] = useState<ExecutionMode>(() => {
    if (typeof window === "undefined") return "server";
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "server" || saved === "agent" ? saved : "server";
  });

  const setExecutionMode = (value: ExecutionMode) => {
    setExecutionModeState(value);
    localStorage.setItem(STORAGE_KEY, value);
  };

  return { executionMode, setExecutionMode };
}
