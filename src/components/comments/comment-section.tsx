"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CommentWithReplies } from "@/types/comment";
import { CommentForm } from "./comment-form";
import { CommentThread } from "./comment-thread";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-provider";

interface CommentSectionProps {
  jobId: string;
  currentUserId: string | null;
}

export function CommentSection({ jobId, currentUserId }: CommentSectionProps) {
  const { t } = useLocale();
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const controllerRef = useRef<AbortController | null>(null);

  const fetchComments = useCallback((isInitial = false) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    fetch(`/api/comments?jobId=${encodeURIComponent(jobId)}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("fetch comments failed");
        return res.json();
      })
      .then((data: { comments: CommentWithReplies[] }) => {
        setComments(data.comments);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("comment load error:", err);
        }
      })
      .finally(() => {
        if (isInitial) setInitialLoading(false);
      });
  }, [jobId]);

  useEffect(() => {
    fetchComments(true);
    return () => controllerRef.current?.abort();
  }, [fetchComments]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const onCommentChange = (payload: { new: Record<string, unknown> }) => {
      if (payload.new?.jobId === jobId) fetchComments();
    };

    const channel = supabase
      .channel(`comments:${jobId}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on("postgres_changes" as any, { event: "INSERT", schema: "public", table: "Comment" }, onCommentChange)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on("postgres_changes" as any, { event: "UPDATE", schema: "public", table: "Comment" }, onCommentChange)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [jobId, fetchComments]);

  async function handleNewComment(body: string) {
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, body }),
    });
    if (!res.ok) throw new Error("post comment failed");
    fetchComments();
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">{t.comments.title}</h3>

      <CommentForm
        placeholder={t.comments.placeholder}
        onSubmit={handleNewComment}
        submitLabel={t.comments.submit}
      />

      {initialLoading ? (
        <p className="text-sm text-muted-foreground">{t.comments.loading}</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t.comments.empty}
        </p>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onRefresh={() => fetchComments()}
              jobId={jobId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
