import fs from "fs";
import path from "path";
import os from "os";
import type { AgentConfig } from "../config/store.js";
import type { ParsedChunk } from "../runner/output-parser.js";

// 전송 실패 시 임시 저장할 디렉토리
const PENDING_DIR = path.join(os.homedir(), ".fireqa", "pending");

// 지수 백오프 재시도 후 실패 시 디스크에 저장하고 에러를 throw
async function retrySendOutput(
  url: string,
  headers: Record<string, string>,
  body: string,
  taskId: string,
  chunks: unknown[]
): Promise<void> {
  const delays = [1000, 2000, 4000];
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    if (attempt > 0) {
      await sleep(delays[attempt - 1]);
    }
    try {
      const res = await fetch(url, { method: "POST", headers, body });
      if (res.ok) return;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  // 모든 재시도 실패 — 디스크에 저장
  try {
    fs.mkdirSync(PENDING_DIR, { recursive: true });
    const filename = `${taskId}-${Date.now()}.json`;
    fs.writeFileSync(
      path.join(PENDING_DIR, filename),
      JSON.stringify({ taskId, chunks, timestamp: Date.now() })
    );
  } catch {
    // 디스크 쓰기 실패는 무시
  }

  throw lastError ?? new Error("sendOutput failed");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ApiClient {
  private baseUrl: string;
  private token: string;

  constructor(config: AgentConfig) {
    this.baseUrl = config.server;
    this.token = config.auth?.token ?? "";
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.token}`,
    };
  }

  async registerConnection(name: string, metadata: Record<string, unknown>): Promise<{ id: string }> {
    const res = await fetch(`${this.baseUrl}/api/agent/connections`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ name, metadata }),
    });
    if (!res.ok) throw new Error(`등록 실패: ${res.status}`);
    return res.json();
  }

  async heartbeat(connectionId: string): Promise<{ cancelledTaskIds: string[] }> {
    const res = await fetch(`${this.baseUrl}/api/agent/connections/${connectionId}`, {
      method: "PUT",
      headers: this.headers(),
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error(`heartbeat 실패: ${res.status}`);
    return res.json();
  }

  async disconnect(connectionId: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/agent/connections/${connectionId}`, {
      method: "DELETE",
      headers: this.headers(),
    });
  }

  async getNextTask(connectionId: string): Promise<unknown | null> {
    const res = await fetch(
      `${this.baseUrl}/api/agent/tasks/next?connectionId=${connectionId}`,
      { headers: this.headers() }
    );
    if (!res.ok) throw new Error(`작업 수령 실패: ${res.status}`);
    const data = await res.json();
    return data.task;
  }

  async updateTaskStatus(
    taskId: string,
    status: string,
    extra?: { errorMessage?: string; sessionId?: string }
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/agent/tasks/${taskId}/status`, {
      method: "PUT",
      headers: this.headers(),
      body: JSON.stringify({ status, ...extra }),
    });
    if (!res.ok) throw new Error(`상태 변경 실패: ${res.status}`);
  }

  async sendOutput(taskId: string, chunks: ParsedChunk[]): Promise<void> {
    const timestamped = chunks.map((c) => ({
      ...c,
      timestamp: new Date().toISOString(),
    }));
    const url = `${this.baseUrl}/api/agent/tasks/${taskId}/output`;
    const body = JSON.stringify({ chunks: timestamped });
    // 실패 시 1s/2s/4s 재시도, 모두 실패하면 ~/.fireqa/pending/ 에 저장
    await retrySendOutput(url, this.headers(), body, taskId, timestamped);
  }

  // 에이전트 시작 시 미전송 파일을 재전송
  async flushPendingOutputs(): Promise<void> {
    if (!fs.existsSync(PENDING_DIR)) return;

    const files = fs.readdirSync(PENDING_DIR).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const filePath = path.join(PENDING_DIR, file);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as {
          taskId: string;
          chunks: unknown[];
        };
        const res = await fetch(`${this.baseUrl}/api/agent/tasks/${data.taskId}/output`, {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify({ chunks: data.chunks }),
        });
        if (res.ok || res.status === 404) {
          // 전송 성공 또는 작업이 이미 없음 — 파일 삭제
          fs.unlinkSync(filePath);
        }
      } catch {
        // 실패 시 다음 시작 때 재시도
      }
    }
  }

  async sendResult(taskId: string, result: unknown, sessionId?: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/agent/tasks/${taskId}/result`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ result, sessionId }),
    });
    if (!res.ok) throw new Error(`결과 전송 실패: ${res.status}`);
  }
}
