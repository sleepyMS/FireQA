"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CommentWithReplies } from "@/types/comment";
import { CommentForm } from "./comment-form";
import { CommentThread } from "./comment-thread";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface CommentSectionProps {
  jobId: string;
  currentUserId: string | null;
}

export function CommentSection({ jobId, currentUserId }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const controllerRef = useRef<AbortController | null>(null);

  const fetchComments = useCallback((isInitial = false) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    if (isInitial) setInitialLoading(true);

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
          console.error("코멘트 로드 오류:", err);
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

  // 다른 사용자의 코멘트를 실시간으로 반영
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel(`comments:${jobId}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "Comment" },
        (payload: { new: Record<string, unknown> }) => {
          if (payload.new?.jobId === jobId) fetchComments();
        }
      )
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "Comment" },
        (payload: { new: Record<string, unknown> }) => {
          if (payload.new?.jobId === jobId) fetchComments();
        }
      )
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
      <h3 className="text-lg font-semibold">코멘트</h3>

      <CommentForm
        placeholder="새 코멘트를 입력하세요..."
        onSubmit={handleNewComment}
        submitLabel="코멘트 등록"
      />

      {initialLoading ? (
        <p className="text-sm text-muted-foreground">코멘트를 불러오는 중...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          아직 코멘트가 없습니다. 첫 번째로 의견을 남겨보세요.
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
