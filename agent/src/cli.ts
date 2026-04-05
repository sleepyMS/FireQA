#!/usr/bin/env node
import { Command } from "commander";
import { ConfigStore } from "./config/store.js";
import { loginWithApiKey } from "./auth/api-key.js";
import { CLI_ADAPTERS, type CliType } from "./runner/adapters.js";
import fs from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";

const PID_FILE = path.join(os.homedir(), ".fireqa", "agent.pid");

const program = new Command();
const store = new ConfigStore();

program
  .name("fireqa-agent")
  .description("FireQA Agent — connect your AI CLI to FireQA")
  .version("0.1.0");

program
  .command("login")
  .description("FireQA에 인증 (기본: OAuth, --api-key: API Key 사용)")
  .option("--api-key", "API Key로 직접 인증")
  .action(async (options: { apiKey?: boolean }) => {
    if (options.apiKey) {
      await loginWithApiKey(store);
    } else {
      const { loginWithOAuth } = await import("./auth/oauth.js");
      await loginWithOAuth(store);
    }
  });

program
  .command("config")
  .description("현재 설정 표시")
  .action(() => {
    const config = store.load();
    const display = {
      ...config,
      auth: config.auth
        ? { token: config.auth.token.slice(0, 12) + "..." }
        : undefined,
    };
    console.log(JSON.stringify(display, null, 2));
  });

program
  .command("config:set <key> <value>")
  .description("설정값 변경 (cli, server, pollingIntervalMs)")
  .action((key: string, value: string) => {
    const numericKeys = ["pollingIntervalMs", "maxConcurrentTasks"];
    const parsed = numericKeys.includes(key) ? parseInt(value, 10) : value;
    store.save({ [key]: parsed } as Partial<import("./config/store.js").AgentConfig>);
    console.log(`${key} = ${parsed}`);
  });

program
  .command("start")
  .description("에이전트 시작 — FireQA 작업 큐를 폴링하고 CLI를 실행")
  .option("--cli-type <type>", "사용할 LLM CLI 타입 (claude | codex | gemini)", "claude")
  .action(async (options: { cliType?: string }) => {
    const cliType = (Object.keys(CLI_ADAPTERS) as CliType[]).find(v => v === options.cliType) ?? "claude";
    store.save({ cliType, cli: CLI_ADAPTERS[cliType].defaultCommand });

    // PID 기록
    const pidDir = path.dirname(PID_FILE);
    if (!fs.existsSync(pidDir)) fs.mkdirSync(pidDir, { recursive: true });
    fs.writeFileSync(PID_FILE, String(process.pid));

    // 종료 시 PID 파일 삭제
    const cleanupPid = () => { try { fs.unlinkSync(PID_FILE); } catch {} };
    process.on("exit", cleanupPid);
    process.on("SIGINT", () => { cleanupPid(); process.exit(0); });
    process.on("SIGTERM", () => { cleanupPid(); process.exit(0); });

    const { startAgent } = await import("./runner/task-poller.js");
    await startAgent(store);
  });

program
  .command("stop")
  .description("실행 중인 에이전트 종료")
  .action(() => {
    if (!fs.existsSync(PID_FILE)) {
      console.log("실행 중인 에이전트가 없습니다.");
      return;
    }
    const pid = parseInt(fs.readFileSync(PID_FILE, "utf-8").trim(), 10);
    try {
      process.kill(pid, "SIGTERM");
      fs.unlinkSync(PID_FILE);
      console.log(`에이전트 종료됨 (PID: ${pid})`);
    } catch {
      console.log("에이전트가 이미 종료되어 있습니다.");
      try { fs.unlinkSync(PID_FILE); } catch {}
    }
  });

program
  .command("restart")
  .description("에이전트 재시작 (최신 버전으로)")
  .option("--cli-type <type>", "사용할 LLM CLI 타입 (claude | codex | gemini)")
  .action((options: { cliType?: string }) => {
    // 실행 중인 프로세스 종료
    if (fs.existsSync(PID_FILE)) {
      const pid = parseInt(fs.readFileSync(PID_FILE, "utf-8").trim(), 10);
      try {
        process.kill(pid, "SIGTERM");
        try { fs.unlinkSync(PID_FILE); } catch {}
        console.log(`기존 에이전트 종료됨 (PID: ${pid})`);
      } catch {}
    }

    // 새 프로세스로 재시작
    const args = ["fireqa-agent@latest", "start"];
    if (options.cliType) args.push("--cli-type", options.cliType);

    const child = spawn("npx", args, { stdio: "inherit", detached: false });
    child.on("error", (err) => {
      console.error(`재시작 실패: ${err.message}`);
      process.exit(1);
    });
    child.on("close", (code) => process.exit(code ?? 0));
  });

program.parse();
