export const JobType = {
  TEST_CASES: "test-cases",
  DIAGRAMS: "diagrams",
  WIREFRAMES: "wireframes",
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
};

export const JOB_TYPE_PATH: Record<string, string> = {
  [JobType.TEST_CASES]: "/generate",
  [JobType.DIAGRAMS]: "/diagrams",
  [JobType.WIREFRAMES]: "/wireframes",
};

export const UserRole = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const DeviceAuthStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  EXPIRED: "expired",
} as const;

export type DeviceAuthStatus =
  (typeof DeviceAuthStatus)[keyof typeof DeviceAuthStatus];
