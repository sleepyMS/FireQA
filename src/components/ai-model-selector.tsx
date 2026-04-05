"use client";

import useSWR from "swr";
import { BrainCircuit } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SWR_KEYS } from "@/lib/swr/keys";
import { fetcher } from "@/lib/swr/fetcher";

interface AIModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function AIModelSelector({ value, onChange, disabled }: AIModelSelectorProps) {
  const { data: keyData } = useSWR<{ hasKey: boolean; keyPrefix?: string | null }>(
    SWR_KEYS.anthropicKey,
    fetcher,
  );

  const hasAnthropicKey = keyData?.hasKey === true;

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <BrainCircuit className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">AI 모델</p>
      </div>
      <Select
        value={value}
        onValueChange={(v) => v && onChange(v)}
        disabled={disabled}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="openai">OpenAI GPT-4o</SelectItem>
          {hasAnthropicKey ? (
            <SelectItem value="anthropic">Anthropic Claude</SelectItem>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={<div />}
                >
                  <SelectItem value="anthropic" disabled>
                    Anthropic Claude
                  </SelectItem>
                </TooltipTrigger>
                <TooltipContent>
                  <p>설정에서 Anthropic API 키를 등록하세요</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
