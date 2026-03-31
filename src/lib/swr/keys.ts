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
} as const;
