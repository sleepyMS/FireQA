export interface CommentData {
  id: string;
  authorId: string;
  body: string;
  targetItemId: string | null;
  isResolved: boolean;
  resolvedById: string | null;
  resolvedAt: string | null;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommentWithReplies extends CommentData {
  replies: CommentData[];
}
