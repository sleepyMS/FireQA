export const TASK_CREDIT_COST: Record<string, number> = {
  "tc-generate": 1,
  "diagram-generate": 1,
  "wireframe-generate": 2,
  "improve-spec": 1,
  "custom": 1,
};

export function getTaskCreditCost(taskType: string): number {
  return TASK_CREDIT_COST[taskType] ?? 1;
}
