"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CommentFormProps {
  placeholder?: string;
  onSubmit: (body: string) => Promise<void>;
  disabled?: boolean;
  initialValue?: string;
  submitLabel?: string;
}

export function CommentForm({
  placeholder = "코멘트를 입력하세요...",
  onSubmit,
  disabled = false,
  initialValue = "",
  submitLabel = "등록",
}: CommentFormProps) {
  const [body, setBody] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const MAX_CHARS = 10000;
  const COUNTER_THRESHOLD = 8000;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(trimmed);
      setBody("");
    } catch (err) {
      console.error("코멘트 제출 오류:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        placeholder={placeholder}
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, MAX_CHARS))}
        disabled={disabled || isSubmitting}
        rows={3}
        className="resize-none"
      />
      <div className="flex items-center justify-between">
        {body.length > COUNTER_THRESHOLD ? (
          <span className="text-xs text-muted-foreground">
            {body.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}자
          </span>
        ) : (
          <span />
        )}
        <Button
          type="submit"
          size="sm"
          disabled={!body.trim() || disabled || isSubmitting}
        >
          {isSubmitting ? "제출 중..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
