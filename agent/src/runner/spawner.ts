import { spawn, type ChildProcess } from "child_process";
import { parseStreamJsonLine, type ParsedChunk } from "./output-parser.js";

export type SpawnResult = {
  exitCode: number;
  chunks: ParsedChunk[];
  fullOutput: string;
};

export async function spawnCli(
  cli: string,
  prompt: string,
  options?: {
    sessionId?: string;
    mcpTools?: string[];
    onChunk?: (chunk: ParsedChunk) => void;
    signal?: AbortSignal;
  }
): Promise<SpawnResult> {
  const args = [
    "--print", prompt,
    "--output-format", "stream-json",
  ];

  if (options?.sessionId) {
    args.push("--resume", options.sessionId);
  }

  if (options?.mcpTools && options.mcpTools.length > 0) {
    args.push("--allowedTools", ...options.mcpTools);
  }

  return new Promise((resolve, reject) => {
    const child: ChildProcess = spawn(cli, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });

    const chunks: ParsedChunk[] = [];
    let fullOutput = "";
    let buffer = "";

    child.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      fullOutput += text;
      buffer += text;

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parsed = parseStreamJsonLine(trimmed);
        if (parsed) {
          chunks.push(parsed);
          options?.onChunk?.(parsed);
        }
      }
    });

    child.stderr?.on("data", (data: Buffer) => {
      const errText = data.toString().trim();
      if (errText) {
        const errChunk: ParsedChunk = { type: "error", content: errText };
        chunks.push(errChunk);
        options?.onChunk?.(errChunk);
      }
    });

    options?.signal?.addEventListener("abort", () => {
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!child.killed) child.kill("SIGKILL");
      }, 5000);
    });

    child.on("close", (code) => {
      if (buffer.trim()) {
        const parsed = parseStreamJsonLine(buffer.trim());
        if (parsed) {
          chunks.push(parsed);
          options?.onChunk?.(parsed);
        }
      }
      resolve({ exitCode: code ?? 1, chunks, fullOutput });
    });

    child.on("error", (err) => {
      reject(new Error(`CLI 실행 실패: ${err.message}`));
    });
  });
}
