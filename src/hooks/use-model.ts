"use client";
import { useState } from "react";
import type { ModelValue } from "@/components/model-selector";

const STORAGE_KEY = "fireqa:selectedModel";
const DEFAULT: ModelValue = "gpt-4.1-mini";

export function useModel() {
  const [selectedModel, setModelState] = useState<ModelValue>(() => {
    if (typeof window === "undefined") return DEFAULT;
    return (localStorage.getItem(STORAGE_KEY) as ModelValue | null) ?? DEFAULT;
  });

  const setSelectedModel = (value: ModelValue) => {
    setModelState(value);
    localStorage.setItem(STORAGE_KEY, value);
  };

  return { selectedModel, setSelectedModel };
}
