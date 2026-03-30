// ─── Agent Connection ───

export const AgentConnectionStatus = {
  ONLINE: "online",
  OFFLINE: "offline",
} as const;

export type AgentConnectionStatus =
  (typeof AgentConnectionStatus)[keyof typeof AgentConnectionStatus];

export const AgentConnectionType = {
  SELF_HOSTED: "self_hosted",
  HOSTED: "hosted",
} as const;

export type AgentConnectionType =
  (typeof AgentConnectionType)[keyof typeof AgentConnectionType];

// ─── Agent Task ───

export const AgentTaskStatus = {
  PENDING: "pending",
  ASSIGNED: "assigned",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
  TIMED_OUT: "timed_out",
} as const;

export type AgentTaskStatus =
  (typeof AgentTaskStatus)[keyof typeof AgentTaskStatus];

export const AgentTaskType = {
  TC_GENERATE: "tc-generate",
  DIAGRAM_GENERATE: "diagram-generate",
  WIREFRAME_GENERATE: "wireframe-generate",
  IMPROVE_SPEC: "improve-spec",
  CUSTOM: "custom",
} as const;

export type AgentTaskType =
  (typeof AgentTaskType)[keyof typeof AgentTaskType];

// ─── Labels ───

export const AGENT_TASK_STATUS_LABEL: Record<string, string> = {
  [AgentTaskStatus.PENDING]: "대기",
  [AgentTaskStatus.ASSIGNED]: "할당됨",
  [AgentTaskStatus.RUNNING]: "실행 중",
  [AgentTaskStatus.COMPLETED]: "완료",
  [AgentTaskStatus.FAILED]: "실패",
  [AgentTaskStatus.CANCELLED]: "취소됨",
  [AgentTaskStatus.TIMED_OUT]: "시간 초과",
};

export const AGENT_TASK_TYPE_LABEL: Record<string, string> = {
  [AgentTaskType.TC_GENERATE]: "TC 생성",
  [AgentTaskType.DIAGRAM_GENERATE]: "다이어그램 생성",
  [AgentTaskType.WIREFRAME_GENERATE]: "와이어프레임 생성",
  [AgentTaskType.IMPROVE_SPEC]: "기획서 개선",
  [AgentTaskType.CUSTOM]: "커스텀",
};

export const AGENT_TASK_STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "destructive" | "secondary" | "outline" }
> = {
  [AgentTaskStatus.PENDING]: { label: "대기", variant: "outline" },
  [AgentTaskStatus.ASSIGNED]: { label: "할당됨", variant: "secondary" },
  [AgentTaskStatus.RUNNING]: { label: "실행 중", variant: "secondary" },
  [AgentTaskStatus.COMPLETED]: { label: "완료", variant: "default" },
  [AgentTaskStatus.FAILED]: { label: "실패", variant: "destructive" },
  [AgentTaskStatus.CANCELLED]: { label: "취소됨", variant: "outline" },
  [AgentTaskStatus.TIMED_OUT]: { label: "시간 초과", variant: "destructive" },
};

// ─── SSE Events (agent → server → browser) ───

export type AgentOutputChunk = {
  type: "text" | "tool_use" | "tool_result" | "error";
  content: string;
  tool?: string;
  timestamp: string;
};

export type AgentTaskContext = {
  uploadUrls?: string[];
  templateContent?: string;
  figmaFileKey?: string;
  [key: string]: unknown;
};
