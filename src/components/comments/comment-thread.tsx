"use client";

import { useRef, useState } from "react";
import { CommentWithReplies } from "@/types/comment";
import { CommentItem } from "./comment-item";
import { CommentForm } from "./comment-form";

interface CommentThreadProps {
  comment: CommentWithReplies;
  currentUserId: string | null;
  onRefresh: () => void;
  jobId: string;
}

export function CommentThread({
  comment,
  currentUserId,
  onRefresh,
  jobId,
}: CommentThreadProps) {
  // Show reply form when there are no replies and comment is not resolved,
  // or when "답글" button is clicked.
  const [showReplyForm, setShowReplyForm] = useState(
    comment.replies.length === 0 && !comment.isResolved
  );
  const replyFormRef = useRef<HTMLDivElement>(null);

  function handleReplyClick() {
    setShowReplyForm(true);
    // Scroll / focus after render
    setTimeout(() => {
      replyFormRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      replyFormRef.current?.querySelector("textarea")?.focus();
    }, 50);
  }

  async function handleResolve() {
    const res = await fetch(`/api/comments/${comment.id}/resolve`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("resolve failed");
    onRefresh();
  }

  async function handleDelete() {
    const res = await fetch(`/api/comments/${comment.id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("delete failed");
    onRefresh();
  }

  async function handleEdit(newBody: string) {
    const res = await fetch(`/api/comments/${comment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newBody }),
    });
    if (!res.ok) throw new Error("edit failed");
    onRefresh();
  }

  async function handleReplySubmit(body: string) {
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, body, parentId: comment.id }),
    });
    if (!res.ok) throw new Error("reply failed");
    setShowReplyForm(false);
    onRefresh();
  }

  async function makeReplyHandlers(replyId: string) {
    return {
      onResolve: async () => {
        // replies don't have resolve, but still provide no-op
      },
      onDelete: async () => {
        const res = await fetch(`/api/comments/${replyId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("delete reply failed");
        onRefresh();
      },
      onEdit: async (newBody: string) => {
        const res = await fetch(`/api/comments/${replyId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: newBody }),
        });
        if (!res.ok) throw new Error("edit reply failed");
        onRefresh();
      },
    };
  }

  return (
    <div className="space-y-3">
      <CommentItem
        comment={comment}
        currentUserId={currentUserId}
        onReply={handleReplyClick}
        onResolve={handleResolve}
        onDelete={handleDelete}
        onEdit={handleEdit}
      />

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="ml-4 pl-4 border-l space-y-3">
          {comment.replies.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              currentUserId={currentUserId}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}

      {/* Reply form */}
      {showReplyForm && (
        <div ref={replyFormRef} className="ml-4 pl-4 border-l">
          <CommentForm
            placeholder="답글을 입력하세요..."
            onSubmit={handleReplySubmit}
            submitLabel="답글 달기"
          />
        </div>
      )}
    </div>
  );
}

// Extracted to avoid async handlers in render
function ReplyItem({
  reply,
  currentUserId,
  onRefresh,
}: {
  reply: CommentWithReplies["replies"][number];
  currentUserId: string | null;
  onRefresh: () => void;
}) {
  async function handleDelete() {
    const res = await fetch(`/api/comments/${reply.id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("delete reply failed");
    onRefresh();
  }

  async function handleEdit(newBody: string) {
    const res = await fetch(`/api/comments/${reply.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newBody }),
    });
    if (!res.ok) throw new Error("edit reply failed");
    onRefresh();
  }

  // Replies don't support resolve
  async function noopResolve() {}

  return (
    <CommentItem
      comment={reply}
      currentUserId={currentUserId}
      onResolve={noopResolve}
      onDelete={handleDelete}
      onEdit={handleEdit}
      isReply
    />
  );
}
