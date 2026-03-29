export interface ActivityLog {
  id: string;
  action: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  projectId: string | null;
  jobId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}
