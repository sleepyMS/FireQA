"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CommentData } from "@/types/comment";
import { CommentForm } from "./comment-form";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { Messages } from "@/lib/i18n/messages";

interface CommentItemProps {
  comment: CommentData;
  currentUserId: string | null;
  onReply?: () => void;
  onResolve: () => Promise<void>;
  onDelete: () => Promise<void>;
  onEdit: (newBody: string) => Promise<void>;
  isReply?: boolean;
}

function getRelativeTime(
  dateStr: string,
  t: Messages["comments"],
  locale: string,
): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t.justNow;
  if (locale === "ko") {
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return `${days}일 전`;
  }
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
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
  const { t, locale } = useLocale();
  const [isEditing, setIsEditing] = useState(false);
  const [isActioning, setIsActioning] = useState(false);

  const isAuthor = currentUserId === comment.authorId;
  const isDeleted = !!comment.deletedAt;

  async function handleResolve() {
    setIsActioning(true);
    try {
      await onResolve();
    } catch (err) {
      console.error("resolve error:", err);
    } finally {
      setIsActioning(false);
    }
  }

  async function handleDelete() {
    setIsActioning(true);
    try {
      await onDelete();
    } catch (err) {
      console.error("delete error:", err);
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
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {t.comments.user} {comment.authorId.slice(0, 8)}
        </span>
        <span>{getRelativeTime(comment.createdAt, t.comments, locale)}</span>
        {comment.editedAt && !isDeleted && (
          <span className="italic">{t.comments.edited}</span>
        )}
        {comment.isResolved && !isReply && (
          <Badge
            variant="outline"
            className="border-green-500 text-green-600 text-xs px-1.5 py-0"
          >
            {t.comments.resolved}
          </Badge>
        )}
      </div>

      {isDeleted ? (
        <p className="text-sm text-muted-foreground italic">
          {t.comments.deleted}
        </p>
      ) : isEditing ? (
        <CommentForm
          initialValue={comment.body}
          onSubmit={handleEdit}
          submitLabel={t.common.save}
          placeholder={t.comments.editPlaceholder}
        />
      ) : (
        <p className="text-sm whitespace-pre-wrap break-words">{comment.body}</p>
      )}

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
              {comment.isResolved ? t.comments.unresolve : t.comments.resolve}
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
              {t.common.edit}
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
              {t.common.delete}
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
              {t.comments.reply}
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
          {t.common.cancel}
        </Button>
      )}
    </div>
  );
}
