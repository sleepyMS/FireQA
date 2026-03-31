type MachineState = {
  id: string;
  instance_id: string;
  state: string; // "created" | "starting" | "started" | "stopping" | "stopped" | "destroying" | "destroyed"
  region: string;
  config: { env?: Record<string, string>; metadata?: Record<string, string> };
  created_at: string;
  updated_at: string;
};

type CreateMachineConfig = {
  region?: string;
  env?: Record<string, string>;
  metadata?: Record<string, string>;
  cpus?: number;
  memoryMb?: number;
};

export class FlyMachinesClient {
  private baseUrl = "https://api.machines.dev/v1";
  private token: string;
  private appName: string;

  constructor() {
    this.token = process.env.FLY_API_TOKEN ?? "";
    this.appName = process.env.FLY_APP_NAME ?? "";
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(
      `${this.baseUrl}/apps/${this.appName}${path}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Fly.io API ${method} ${path}: ${res.status} ${text}`);
    }
    if (res.status === 204) return {} as T;
    return res.json();
  }

  async createMachine(config: CreateMachineConfig): Promise<MachineState> {
    return this.request<MachineState>("POST", "/machines", {
      config: {
        image: process.env.FLY_WORKER_IMAGE,
        guest: {
          cpu_kind: "shared",
          cpus: config.cpus ?? 2,
          memory_mb: config.memoryMb ?? 2048,
        },
        env: config.env ?? {},
        auto_destroy: false,
        restart: { policy: "no" },
        metadata: config.metadata ?? {},
      },
      region: config.region ?? process.env.FLY_WORKER_REGION ?? "nrt",
    });
  }

  async startMachine(machineId: string): Promise<void> {
    await this.request("POST", `/machines/${machineId}/start`);
  }

  async stopMachine(machineId: string): Promise<void> {
    await this.request("POST", `/machines/${machineId}/stop`);
  }

  async destroyMachine(machineId: string): Promise<void> {
    await this.request("DELETE", `/machines/${machineId}?force=true`);
  }

  async getMachine(machineId: string): Promise<MachineState> {
    return this.request<MachineState>("GET", `/machines/${machineId}`);
  }

  async listMachines(): Promise<MachineState[]> {
    return this.request<MachineState[]>("GET", "/machines");
  }

  async waitForState(
    machineId: string,
    state: string,
    timeoutMs = 30_000,
  ): Promise<void> {
    const timeoutSec = Math.ceil(timeoutMs / 1000);
    await this.request(
      "GET",
      `/machines/${machineId}/wait?state=${state}&timeout=${timeoutSec}`,
    );
  }
}
