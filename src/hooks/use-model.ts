"use client";
import { useState, useEffect } from "react";
import type { ModelValue } from "@/components/model-selector";

const STORAGE_KEY = "fireqa:selectedModel";
const DEFAULT: ModelValue = "gpt-4.1-mini";

export function useModel() {
  const [selectedModel, setModelState] = useState<ModelValue>(DEFAULT);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ModelValue | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setModelState(saved);
  }, []);

  const setSelectedModel = (value: ModelValue) => {
    setModelState(value);
    localStorage.setItem(STORAGE_KEY, value);
  };

  return { selectedModel, setSelectedModel };
}
