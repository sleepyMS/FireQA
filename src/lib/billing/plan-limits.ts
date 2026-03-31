export const PLAN_LIMITS = {
  free: {
    generationsPerHour: 20,
    projectsMax: 3,
    membersMax: 3,
    uploadsMaxMb: 10,
    monthlyCredits: 5,
    maxConcurrentHostedTasks: 1,
  },
  pro: {
    generationsPerHour: 100,
    projectsMax: 20,
    membersMax: 10,
    uploadsMaxMb: 50,
    monthlyCredits: 50,
    maxConcurrentHostedTasks: 3,
  },
  enterprise: {
    generationsPerHour: 1000,
    projectsMax: Infinity,
    membersMax: Infinity,
    uploadsMaxMb: 200,
    monthlyCredits: Infinity,
    maxConcurrentHostedTasks: 10,
  },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[plan as Plan] ?? PLAN_LIMITS.free;
}
