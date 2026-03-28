"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CommentData } from "@/types/comment";
import { CommentForm } from "./comment-form";

interface CommentItemProps {
  comment: CommentData;
  currentUserId: string | null;
  onReply?: () => void;
  onResolve: () => Promise<void>;
  onDelete: () => Promise<void>;
  onEdit: (newBody: string) => Promise<void>;
  isReply?: boolean;
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  return `${days}일 전`;
}

export function CommentItem({
  comment,
  currentUserId,
  onReply,
  onResolve,
  onDelete,
  onEdit,
  isReply = false,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isActioning, setIsActioning] = useState(false);

  const isAuthor = currentUserId === comment.authorId;
  const isDeleted = !!comment.deletedAt;

  async function handleResolve() {
    setIsActioning(true);
    try {
      await onResolve();
    } catch (err) {
      console.error("해결 처리 오류:", err);
    } finally {
      setIsActioning(false);
    }
  }

  async function handleDelete() {
    setIsActioning(true);
    try {
      await onDelete();
    } catch (err) {
      console.error("삭제 오류:", err);
    } finally {
      setIsActioning(false);
    }
  }

  async function handleEdit(newBody: string) {
    await onEdit(newBody);
    setIsEditing(false);
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          사용자 {comment.authorId.slice(0, 8)}
        </span>
        <span>{getRelativeTime(comment.createdAt)}</span>
        {comment.editedAt && !isDeleted && (
          <span className="italic">(수정됨)</span>
        )}
        {comment.isResolved && !isReply && (
          <Badge
            variant="outline"
            className="border-green-500 text-green-600 text-xs px-1.5 py-0"
          >
            해결됨
          </Badge>
        )}
      </div>

      {/* Body */}
      {isDeleted ? (
        <p className="text-sm text-muted-foreground italic">
          삭제된 코멘트입니다.
        </p>
      ) : isEditing ? (
        <CommentForm
          initialValue={comment.body}
          onSubmit={handleEdit}
          submitLabel="저장"
          placeholder="코멘트를 수정하세요..."
        />
      ) : (
        <p className="text-sm whitespace-pre-wrap break-words">{comment.body}</p>
      )}

      {/* Actions */}
      {!isDeleted && !isEditing && (
        <div className="flex items-center gap-1 pt-0.5">
          {!isReply && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleResolve}
              disabled={isActioning}
            >
              {comment.isResolved ? "해결 취소" : "해결"}
            </Button>
          )}
          {isAuthor && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setIsEditing(true)}
              disabled={isActioning}
            >
              편집
            </Button>
          )}
          {isAuthor && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={isActioning}
            >
              삭제
            </Button>
          )}
          {!isReply && onReply && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={onReply}
              disabled={isActioning}
            >
              답글
            </Button>
          )}
        </div>
      )}
      {!isDeleted && isEditing && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => setIsEditing(false)}
        >
          취소
        </Button>
      )}
    </div>
  );
}
