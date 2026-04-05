import fs from "fs";
import path from "path";
import os from "os";
import type { CliType } from "../runner/adapters.js";

export type AgentMode = "self_hosted" | "hosted";

export type AgentConfig = {
  server: string;
  auth?: {
    token: string;
  };
  cliType: CliType;
  cli: string;          // 실행할 명령어 (기본값: cliType의 defaultCommand)
  pollingIntervalMs: number;
  maxConcurrentTasks: number;
  mode: AgentMode;
};

const DEFAULTS: AgentConfig = {
  server: "https://fireqa.vercel.app",
  cliType: "claude",
  cli: "claude",
  pollingIntervalMs: 3000,
  maxConcurrentTasks: 1,
  mode: "self_hosted",
};

export class ConfigStore {
  private configPath: string;

  constructor(configDir?: string) {
    const dir = configDir ?? path.join(os.homedir(), ".fireqa");
    this.configPath = path.join(dir, "config.json");
  }

  load(): AgentConfig {
    // 환경변수 우선 (hosted 모드에서 Docker ENV로 주입)
    const envOverrides: Partial<AgentConfig> = {};
    if (process.env.FIREQA_SERVER) envOverrides.server = process.env.FIREQA_SERVER;
    if (process.env.FIREQA_TOKEN) envOverrides.auth = { token: process.env.FIREQA_TOKEN };
    if (process.env.FIREQA_CLI) envOverrides.cli = process.env.FIREQA_CLI;
    if (process.env.FIREQA_MODE) envOverrides.mode = process.env.FIREQA_MODE as AgentMode;
    if (process.env.FIREQA_POLLING_INTERVAL) envOverrides.pollingIntervalMs = parseInt(process.env.FIREQA_POLLING_INTERVAL, 10);

    let fileConfig: Partial<AgentConfig> = {};
    try {
      const raw = fs.readFileSync(this.configPath, "utf-8");
      fileConfig = JSON.parse(raw);
    } catch {
      // 파일 없으면 무시
    }

    return { ...DEFAULTS, ...fileConfig, ...envOverrides };
  }

  save(partial: Partial<AgentConfig>): void {
    const current = this.load();
    const merged = { ...current, ...partial };
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.configPath, JSON.stringify(merged, null, 2));
  }

  setToken(token: string): void {
    this.save({ auth: { token } });
  }
}
