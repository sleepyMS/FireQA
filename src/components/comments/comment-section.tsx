"use client";

import { useCallback, useEffect, useState } from "react";
import { CommentWithReplies } from "@/types/comment";
import { CommentForm } from "./comment-form";
import { CommentThread } from "./comment-thread";

interface CommentSectionProps {
  jobId: string;
  currentUserId: string | null;
}

export function CommentSection({ jobId, currentUserId }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchComments = useCallback(() => {
    const controller = new AbortController();
    setIsLoading(true);

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
        setIsLoading(false);
      });

    return controller;
  }, [jobId]);

  useEffect(() => {
    const controller = fetchComments();
    return () => controller.abort();
  }, [fetchComments]);

  async function handleNewComment(body: string) {
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, body }),
    });
    if (!res.ok) throw new Error("post comment failed");
    fetchComments();
  }

  function handleRefresh() {
    fetchComments();
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">코멘트</h3>

      {/* New comment form */}
      <CommentForm
        placeholder="새 코멘트를 입력하세요..."
        onSubmit={handleNewComment}
        submitLabel="코멘트 등록"
      />

      {/* Comment list */}
      {isLoading ? (
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
              onRefresh={handleRefresh}
              jobId={jobId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
