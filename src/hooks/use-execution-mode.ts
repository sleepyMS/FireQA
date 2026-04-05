"use client";
import { useState, useEffect } from "react";

export type ExecutionMode = "server" | "agent";
const STORAGE_KEY = "fireqa:executionMode";

export function useExecutionMode() {
  const [executionMode, setExecutionModeState] = useState<ExecutionMode>("server");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "server" || saved === "agent") {
      setExecutionModeState(saved);
    }
  }, []);

  const setExecutionMode = (value: ExecutionMode) => {
    setExecutionModeState(value);
    localStorage.setItem(STORAGE_KEY, value);
  };

  return { executionMode, setExecutionMode };
}
