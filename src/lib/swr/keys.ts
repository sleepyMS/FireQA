export const SWR_KEYS = {
  memberships: "/api/user/memberships",
  notificationCount: "/api/notifications/count",
  notifications: "/api/notifications",
  analytics: "/api/analytics",
  jobs: (params: string) => `/api/jobs?${params}`,
  projects: (params: string) => `/api/projects?${params}`,
  agentConnections: "/api/agent/connections",
  agentTasks: (params: string) => `/api/tasks?${params}`,
  agentDashboard: "/api/agent/dashboard",
  agentStatus: "/api/agent/status",
  // Phase 4.5: 호스티드 에이전트 관련 키
  billingCredits: "/api/billing/credits",
  anthropicKey: "/api/settings/anthropic-key",
  hostedWorkers: "/api/admin/workers",
} as const;
