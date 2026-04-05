#!/usr/bin/env node
import { Command } from "commander";
import { ConfigStore } from "./config/store.js";
import { loginWithApiKey } from "./auth/api-key.js";

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
    const validTypes = ["claude", "codex", "gemini"] as const;
    type CliType = typeof validTypes[number];
    const cliType = validTypes.includes(options.cliType as CliType)
      ? (options.cliType as CliType)
      : "claude";
    const { CLI_ADAPTERS } = await import("./runner/adapters.js");
    store.save({ cliType, cli: CLI_ADAPTERS[cliType].defaultCommand });
    const { startAgent } = await import("./runner/task-poller.js");
    await startAgent(store);
  });

program.parse();
