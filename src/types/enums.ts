export const JobType = {
  TEST_CASES: "test-cases",
  DIAGRAMS: "diagrams",
  WIREFRAMES: "wireframes",
  SPEC_IMPROVE: "spec-improve",
} as const;

export type JobType = (typeof JobType)[keyof typeof JobType];

export const JobStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "destructive" | "secondary" | "outline" }
> = {
  [JobStatus.COMPLETED]: { label: "완료", variant: "default" },
  [JobStatus.FAILED]: { label: "실패", variant: "destructive" },
  [JobStatus.PROCESSING]: { label: "처리중", variant: "secondary" },
  [JobStatus.PENDING]: { label: "대기", variant: "outline" },
};

export const JOB_TYPE_LABEL: Record<string, string> = {
  [JobType.TEST_CASES]: "TC 생성",
  [JobType.DIAGRAMS]: "다이어그램",
  [JobType.WIREFRAMES]: "와이어프레임",
  [JobType.SPEC_IMPROVE]: "기획서 개선",
};

export const JOB_TYPE_PATH: Record<string, string> = {
  [JobType.TEST_CASES]: "/generate",
  [JobType.DIAGRAMS]: "/diagrams",
  [JobType.WIREFRAMES]: "/wireframes",
  [JobType.SPEC_IMPROVE]: "/improve",
};

export const UserRole = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const InviteStatus = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  CANCELLED: "cancelled",
} as const;

export type InviteStatus = (typeof InviteStatus)[keyof typeof InviteStatus];

export const ROLE_LABEL: Record<string, string> = {
  [UserRole.OWNER]: "소유자",
  [UserRole.ADMIN]: "관리자",
  [UserRole.MEMBER]: "멤버",
};

export const PLAN_LABEL: Record<string, string> = {
  free: "무료",
  pro: "Pro",
  enterprise: "Enterprise",
};

export const DeviceAuthStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  EXPIRED: "expired",
} as const;

export type DeviceAuthStatus =
  (typeof DeviceAuthStatus)[keyof typeof DeviceAuthStatus];

export const NotificationType = {
  COMMENT_REPLY: "comment.reply",
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const ActivityAction = {
  GENERATION_COMPLETED: "generation.completed",
  GENERATION_FAILED: "generation.failed",
  PROJECT_CREATED: "project.created",
  PROJECT_UPDATED: "project.updated",
  PROJECT_ARCHIVED: "project.archived",
  PROJECT_UNARCHIVED: "project.unarchived",
  PROJECT_DELETED: "project.deleted",
  PROJECT_RESTORED: "project.restored",
  MEMBER_INVITED: "member.invited",
  MEMBER_ROLE_CHANGED: "member.role_changed",
  MEMBER_REMOVED: "member.removed",
  VERSION_CREATED: "version.created",
  VERSION_ACTIVATED: "version.activated",
  // Agent 관련 액션
  AGENT_CONNECTED: "agent.connected",
  AGENT_DISCONNECTED: "agent.disconnected",
  AGENT_TASK_CREATED: "agent.task_created",
  AGENT_TASK_COMPLETED: "agent.task_completed",
  AGENT_TASK_FAILED: "agent.task_failed",
} as const;

export type ActivityAction = (typeof ActivityAction)[keyof typeof ActivityAction];
