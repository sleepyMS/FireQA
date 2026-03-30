import { ConfigStore, type AgentConfig } from "../config/store.js";
import { ApiClient } from "../reporter/api-client.js";
import { spawnCli } from "./spawner.js";
import type { ParsedChunk } from "./output-parser.js";
import { execSync } from "child_process";
import os from "os";

function checkCliInstalled(cli: string): boolean {
  try {
    execSync(`which ${cli}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export async function startAgent(store: ConfigStore): Promise<void> {
  const config = store.load();

  if (!config.auth?.token) {
    console.error("먼저 로그인하세요: fireqa-agent login");
    process.exit(1);
  }

  if (!checkCliInstalled(config.cli)) {
    console.error(`${config.cli}가 설치되어 있지 않습니다.`);
    console.error(`설치: npm install -g @anthropic-ai/claude-code`);
    process.exit(1);
  }

  const api = new ApiClient(config);

  const agentName = `${process.env.USER ?? "agent"}@${os.hostname()}`;
  let connection: { id: string };
  try {
    connection = await api.registerConnection(agentName, {
      cli: config.cli,
      os: process.platform,
      nodeVersion: process.version,
    });
  } catch (err) {
    console.error(`에이전트 등록 실패: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  console.log(`FireQA에 연결됨. 작업 대기 중... (${config.server})`);

  // 이전 실행에서 미전송된 출력 데이터 재전송 시도
  await api.flushPendingOutputs().catch(() => {});
  console.log("미전송 데이터 확인 완료");

  const cleanup = async () => {
    console.log("\n에이전트 종료 중...");
    await api.disconnect(connection.id).catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // 10초마다 heartbeat
  const heartbeatTimer = setInterval(async () => {
    try {
      await api.heartbeat(connection.id);
    } catch {
      // heartbeat 실패 무시
    }
  }, 10_000);

  while (true) {
    try {
      const task = await api.getNextTask(connection.id) as {
        id: string;
        type: string;
        prompt: string;
        context: Record<string, unknown>;
        mcpTools: string[];
        sessionId: string | null;
        timeoutMs: number;
      } | null;

      if (task) {
        console.log(`작업 수령: [${task.type}] ${task.prompt.slice(0, 50)}...`);
        await executeTask(config, api, task);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("401")) {
        console.error("인증 실패. API Key를 확인하세요.");
        clearInterval(heartbeatTimer);
        process.exit(1);
      }
    }

    await sleep(config.pollingIntervalMs);
  }
}

async function executeTask(
  config: AgentConfig,
  api: ApiClient,
  task: {
    id: string;
    prompt: string;
    mcpTools: string[];
    sessionId: string | null;
    timeoutMs: number;
  }
): Promise<void> {
  await api.updateTaskStatus(task.id, "running");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), task.timeoutMs);

  let chunkBuffer: ParsedChunk[] = [];
  const flushInterval = setInterval(async () => {
    if (chunkBuffer.length > 0) {
      const toSend = [...chunkBuffer];
      chunkBuffer = [];
      await api.sendOutput(task.id, toSend).catch(() => {});
    }
  }, 500);

  try {
    const result = await spawnCli(config.cli, task.prompt, {
      sessionId: task.sessionId ?? undefined,
      mcpTools: task.mcpTools,
      onChunk: (chunk) => { chunkBuffer.push(chunk); },
      signal: controller.signal,
    });

    clearInterval(flushInterval);
    if (chunkBuffer.length > 0) {
      await api.sendOutput(task.id, chunkBuffer).catch(() => {});
    }

    if (result.exitCode === 0) {
      // result 청크에서 sessionId 추출 (세션 연속성: 다음 작업에서 --resume에 사용)
      const sessionId = result.chunks
        .filter((c) => c.sessionId)
        .at(-1)?.sessionId;

      await api.sendResult(task.id, { output: result.fullOutput }, sessionId);
      console.log(`작업 완료: ${task.id}`);
    } else {
      await api.updateTaskStatus(task.id, "failed", {
        errorMessage: `CLI exited with code ${result.exitCode}`,
      });
      console.error(`작업 실패: ${task.id} (exit code: ${result.exitCode})`);
    }
  } catch (err) {
    clearInterval(flushInterval);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";

    if (controller.signal.aborted) {
      await api.updateTaskStatus(task.id, "timed_out", { errorMessage: "작업 시간 초과" });
      console.error(`작업 시간 초과: ${task.id}`);
    } else {
      await api.updateTaskStatus(task.id, "failed", { errorMessage: message });
      console.error(`작업 실패: ${task.id} — ${message}`);
    }
  } finally {
    clearTimeout(timeout);
    clearInterval(flushInterval);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
