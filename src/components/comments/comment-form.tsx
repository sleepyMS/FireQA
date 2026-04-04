"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SWR_KEYS } from "@/lib/swr/keys";
import { fetcher } from "@/lib/swr/fetcher";

interface Member {
  id: string;
  name: string;
  email: string;
}

interface MembersResponse {
  members: Member[];
}

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

  // 멘션 팝오버 상태
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const { data: membersData } = useSWR<MembersResponse>(
    SWR_KEYS.organizationMembers,
    fetcher,
  );
  const members = membersData?.members ?? [];

  const filteredMembers = mentionOpen
    ? members.filter((m) =>
        m.name.toLowerCase().includes(mentionQuery.toLowerCase()),
      )
    : [];

  const MAX_CHARS = 10000;
  const COUNTER_THRESHOLD = 8000;

  const closeMention = useCallback(() => {
    setMentionOpen(false);
    setMentionQuery("");
    setMentionIndex(0);
    setMentionStart(-1);
  }, []);

  const insertMention = useCallback(
    (member: Member) => {
      if (mentionStart < 0) return;
      const before = body.slice(0, mentionStart);
      const after = body.slice(mentionStart + 1 + mentionQuery.length);
      const inserted = `${before}@${member.name} ${after}`;
      setBody(inserted.slice(0, MAX_CHARS));
      closeMention();

      // textarea에 포커스 복원
      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (ta) {
          const cursorPos = mentionStart + member.name.length + 2; // @name + space
          ta.focus();
          ta.setSelectionRange(cursorPos, cursorPos);
        }
      });
    },
    [body, mentionStart, mentionQuery, closeMention],
  );

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value.slice(0, MAX_CHARS);
    setBody(val);

    const cursorPos = e.target.selectionStart;
    // @ 직전까지의 텍스트를 확인해서 멘션 시작 지점 탐색
    const textBeforeCursor = val.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex >= 0) {
      const charBeforeAt = atIndex > 0 ? textBeforeCursor[atIndex - 1] : " ";
      const queryText = textBeforeCursor.slice(atIndex + 1);
      // @ 앞이 공백이거나 줄의 시작이고, 쿼리에 공백이 없으면 멘션 모드
      if (
        (charBeforeAt === " " || charBeforeAt === "\n" || atIndex === 0) &&
        !queryText.includes(" ")
      ) {
        setMentionOpen(true);
        setMentionQuery(queryText);
        setMentionStart(atIndex);
        setMentionIndex(0);
        return;
      }
    }

    closeMention();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!mentionOpen || filteredMembers.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIndex((i) => (i + 1) % filteredMembers.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIndex(
        (i) => (i - 1 + filteredMembers.length) % filteredMembers.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      insertMention(filteredMembers[mentionIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeMention();
    }
  }

  // 팝오버 외부 클릭 시 닫기
  useEffect(() => {
    if (!mentionOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        closeMention();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [mentionOpen, closeMention]);

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
      <div className="relative">
        <Textarea
          ref={textareaRef}
          placeholder={placeholder}
          value={body}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || isSubmitting}
          rows={3}
          className="resize-none"
        />
        {mentionOpen && filteredMembers.length > 0 && (
          <div
            ref={popoverRef}
            className="absolute left-0 bottom-full z-50 mb-1 w-64 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md"
          >
            {filteredMembers.map((member, i) => (
              <button
                key={member.id}
                type="button"
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent ${
                  i === mentionIndex ? "bg-accent" : ""
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(member);
                }}
                onMouseEnter={() => setMentionIndex(i)}
              >
                <span className="font-medium truncate">{member.name}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {member.email}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
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
