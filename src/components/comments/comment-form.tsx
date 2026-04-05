"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/lib/i18n/locale-provider";

interface CommentFormProps {
  placeholder?: string;
  onSubmit: (body: string) => Promise<void>;
  disabled?: boolean;
  initialValue?: string;
  submitLabel?: string;
}

export function CommentForm({
  placeholder,
  onSubmit,
  disabled = false,
  initialValue = "",
  submitLabel,
}: CommentFormProps) {
  const { t } = useLocale();
  const [body, setBody] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolvedPlaceholder = placeholder ?? t.comments.placeholder;
  const resolvedSubmitLabel = submitLabel ?? t.comments.register;

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
      console.error("comment submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        placeholder={resolvedPlaceholder}
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, MAX_CHARS))}
        disabled={disabled || isSubmitting}
        rows={3}
        className="resize-none"
      />
      <div className="flex items-center justify-between">
        {body.length > COUNTER_THRESHOLD ? (
          <span className="text-xs text-muted-foreground">
            {body.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
          </span>
        ) : (
          <span />
        )}
        <Button
          type="submit"
          size="sm"
          disabled={!body.trim() || disabled || isSubmitting}
        >
          {isSubmitting ? t.comments.submitting : resolvedSubmitLabel}
        </Button>
      </div>
    </form>
  );
}
