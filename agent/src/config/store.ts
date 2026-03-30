import fs from "fs";
import path from "path";
import os from "os";

export type AgentConfig = {
  server: string;
  auth?: {
    token: string;
  };
  cli: string;
  pollingIntervalMs: number;
  maxConcurrentTasks: number;
};

const DEFAULTS: AgentConfig = {
  server: "https://fireqa.vercel.app",
  cli: "claude",
  pollingIntervalMs: 3000,
  maxConcurrentTasks: 1,
};

export class ConfigStore {
  private configPath: string;

  constructor(configDir?: string) {
    const dir = configDir ?? path.join(os.homedir(), ".fireqa");
    this.configPath = path.join(dir, "config.json");
  }

  load(): AgentConfig {
    try {
      const raw = fs.readFileSync(this.configPath, "utf-8");
      return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULTS };
    }
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
