"use client";

import { cn } from "@/lib/utils";

export const MODEL_OPTIONS = [
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini", desc: "빠름 · 기본값" },
  { value: "gpt-4.1", label: "GPT-4.1", desc: "정확함" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", desc: "빠름" },
  { value: "gpt-4o", label: "GPT-4o", desc: "고성능" },
  { value: "claude-sonnet", label: "Claude Sonnet", desc: "내 API 키 필요" },
] as const;

export type ModelValue = typeof MODEL_OPTIONS[number]["value"];

interface Props {
  value: ModelValue;
  onChange: (value: ModelValue) => void;
  disabled?: boolean;
}

export function ModelSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {MODEL_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          disabled={disabled}
          className={cn(
            "flex flex-col items-start rounded-lg border-2 px-3 py-2 text-left text-sm transition-all",
            value === opt.value
              ? "border-primary bg-primary/5"
              : "border-transparent bg-muted/50 hover:bg-muted",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <span className="font-medium">{opt.label}</span>
          <span className="text-xs text-muted-foreground">{opt.desc}</span>
        </button>
      ))}
    </div>
  );
}
