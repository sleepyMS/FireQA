import type { AgentConfig } from "../config/store.js";
import type { ParsedChunk } from "../runner/output-parser.js";

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
    await fetch(`${this.baseUrl}/api/agent/tasks/${taskId}/output`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ chunks: timestamped }),
    });
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
