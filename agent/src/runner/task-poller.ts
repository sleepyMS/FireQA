import { ConfigStore, type AgentConfig } from "../config/store.js";
import { ApiClient } from "../reporter/api-client.js";
import { spawnCli, CLI_ADAPTERS } from "./adapters.js";
import type { ParsedChunk } from "./output-parser.js";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import os from "os";

// 실행 중인 작업의 AbortController를 추적하여 heartbeat에서 취소 신호를 전달
const runningTasks = new Map<string, AbortController>();

// 네트워크 재연결을 위한 exponential backoff 계산
const MAX_BACKOFF_MS = 60_000;
const BASE_DELAY_MS = 1_000;

function getBackoffDelay(consecutiveFailures: number): number {
  if (consecutiveFailures === 0) return 0;
  const delay = Math.min(BASE_DELAY_MS * Math.pow(2, consecutiveFailures - 1), MAX_BACKOFF_MS);
  return delay + Math.random() * 1000; // jitter
}

let _agentVersion = "";
function getAgentVersion(): string {
  if (_agentVersion) return _agentVersion;
  try {
    const pkgPath = new URL("../../package.json", import.meta.url);
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    _agentVersion = pkg.version ?? "0.1.0";
  } catch {
    _agentVersion = "0.1.0";
  }
  return _agentVersion;
}

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

  const adapter = CLI_ADAPTERS[config.cliType];
  if (!checkCliInstalled(config.cli)) {
    console.error(`${adapter.label} (${config.cli})가 설치되어 있지 않습니다.`);
    console.error(`설치: ${adapter.installUrl}`);
    console.error(`로그인: ${adapter.loginHint}`);
    process.exit(1);
  }

  // hosted 모드: 서버 컨테이너에서 실행, 짧은 polling/heartbeat 간격
  if (config.mode === "hosted") {
    await startHostedWorker(config);
    return;
  }

  const api = new ApiClient(config);

  const agentName = `${process.env.USER ?? "agent"}@${os.hostname()}`;
  let connection: { id: string };
  try {
    connection = await api.registerConnection(agentName, {
      cli: config.cli,
      os: process.platform,
      nodeVersion: process.version,
      version: getAgentVersion(),
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

  // 10초마다 heartbeat — cancelledTaskIds를 받아 실행 중인 작업 중단
  let heartbeatFailures = 0;
  const heartbeatTimer = setInterval(async () => {
    try {
      const res = await api.heartbeat(connection.id);
      heartbeatFailures = 0;
      if (res.cancelledTaskIds && res.cancelledTaskIds.length > 0) {
        for (const taskId of res.cancelledTaskIds) {
          const controller = runningTasks.get(taskId);
          if (controller) {
            controller.abort("cancelled");
            console.log(`작업 취소 신호 전송: ${taskId}`);
          }
        }
      }
    } catch {
      heartbeatFailures++;
      if (heartbeatFailures > 3) {
        console.warn(`heartbeat 연속 실패 (${heartbeatFailures}회)`);
      }
    }
  }, 10_000);

  let pollingFailures = 0;

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

      pollingFailures = 0;

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
      pollingFailures++;
      const backoff = getBackoffDelay(pollingFailures);
      if (pollingFailures === 1) {
        console.warn("서버 연결 실패. 재연결 시도 중...");
      }
      if (backoff > 0) {
        await sleep(backoff);
        continue; // backoff 후 바로 재시도 (아래 pollingIntervalMs 대기 건너뜀)
      }
    }

    await sleep(config.pollingIntervalMs);
  }
}

// Figma MCP 가용성을 캐싱 (에이전트 수명 동안 유효)
let figmaMcpAvailable: boolean | null = null;

function checkFigmaMcp(cli: string): boolean {
  if (figmaMcpAvailable !== null) return figmaMcpAvailable;
  try {
    const output = execSync(`${cli} mcp list 2>/dev/null`, { encoding: "utf-8", timeout: 5000 });
    figmaMcpAvailable = output.toLowerCase().includes("figma");
  } catch {
    figmaMcpAvailable = true; // 명령어 실패 시 검증 건너뜀 (soft fail)
  }
  return figmaMcpAvailable;
}

async function executeTask(
  config: AgentConfig,
  api: ApiClient,
  task: {
    id: string;
    type: string;
    prompt: string;
    context: Record<string, unknown>;
    mcpTools: string[];
    sessionId: string | null;
    timeoutMs: number;
  }
): Promise<void> {
  // Figma MCP 미설정 감지: figma 도구가 필요한 작업인데 MCP가 없으면 사전 차단
  const needsFigma = task.mcpTools?.some((t) => t.includes("figma")) &&
    task.context?.figmaFileKey;
  if (needsFigma && !checkFigmaMcp(config.cli)) {
    await api.updateTaskStatus(task.id, "failed", {
      errorMessage: "Figma MCP가 설정되어 있지 않습니다. 'claude mcp add figma' 명령으로 설정해주세요.",
    });
    console.error(`작업 실패: ${task.id} — Figma MCP 미설정`);
    return;
  }

  await api.updateTaskStatus(task.id, "running");

  const controller = new AbortController();
  runningTasks.set(task.id, controller);
  const timeout = setTimeout(() => controller.abort("timeout"), task.timeoutMs);

  let chunkBuffer: ParsedChunk[] = [];
  const flushInterval = setInterval(async () => {
    if (chunkBuffer.length > 0) {
      const toSend = [...chunkBuffer];
      chunkBuffer = [];
      await api.sendOutput(task.id, toSend).catch(() => {});
    }
  }, 500);

  try {
    const result = await spawnCli(config.cliType, config.cli, task.prompt, {
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
      const reason = controller.signal.reason;
      if (reason === "cancelled") {
        // 서버에서 이미 cancelled로 변경했으므로 상태 업데이트 불필요
        console.log(`작업 취소됨: ${task.id}`);
      } else {
        await api.updateTaskStatus(task.id, "timed_out", { errorMessage: "작업 시간 초과" });
        console.error(`작업 시간 초과: ${task.id}`);
      }
    } else {
      await api.updateTaskStatus(task.id, "failed", { errorMessage: message });
      console.error(`작업 실패: ${task.id} — ${message}`);
    }
  } finally {
    clearTimeout(timeout);
    clearInterval(flushInterval);
    runningTasks.delete(task.id);
  }
}

async function startHostedWorker(config: AgentConfig): Promise<void> {
  const api = new ApiClient(config);

  await api.flushPendingOutputs().catch(() => {});

  let connection: { id: string };
  try {
    connection = await api.registerConnection("hosted-worker", {
      cli: config.cli,
      os: process.platform,
      nodeVersion: process.version,
      version: getAgentVersion(),
      mode: "hosted",
    });
  } catch (err) {
    console.error(`호스티드 워커 등록 실패: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  console.log(`호스티드 워커 연결됨 (${config.server})`);

  const cleanup = async () => {
    await api.disconnect(connection.id).catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // hosted 모드: 5초 heartbeat
  let heartbeatFailures = 0;
  const heartbeatTimer = setInterval(async () => {
    try {
      const res = await api.heartbeat(connection.id);
      heartbeatFailures = 0;
      if (res.cancelledTaskIds?.length > 0) {
        for (const taskId of res.cancelledTaskIds) {
          const controller = runningTasks.get(taskId);
          if (controller) {
            controller.abort("cancelled");
            console.log(`작업 취소 신호: ${taskId}`);
          }
        }
      }
    } catch {
      heartbeatFailures++;
      if (heartbeatFailures > 5) {
        console.error("heartbeat 연속 실패. 워커 종료.");
        clearInterval(heartbeatTimer);
        process.exit(1);
      }
    }
  }, 5_000);

  // hosted 모드: 1초 간격 polling, 연속 실행
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
        console.error("인증 실패. 워커 종료.");
        clearInterval(heartbeatTimer);
        process.exit(1);
      }
    }

    await sleep(1000);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
