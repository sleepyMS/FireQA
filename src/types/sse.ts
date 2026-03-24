export const Stage = {
  CONNECTING: "connecting",
  PARSING: "parsing",
  GENERATING: "generating",
  SANITIZING: "sanitizing",
  SAVING: "saving",
  FIXING: "fixing",
  IMPROVING: "improving",
} as const;

export type Stage = (typeof Stage)[keyof typeof Stage];

export type SSEEvent =
  | { type: "job_created"; jobId: string }
  | { type: "stage"; stage: Stage; message: string; progress?: number }
  | { type: "chunk_progress"; index: number; total: number; charsSoFar: number }
  | { type: "progress"; charsReceived: number }
  | { type: "complete"; data: unknown; tokenUsage: number }
  | { type: "error"; message: string };
