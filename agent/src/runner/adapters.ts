import { type ChildProcess, spawn } from "child_process";
import { parseStreamJsonLine, type ParsedChunk } from "./output-parser.js";

export type CliType = "claude" | "codex" | "gemini";

export const CLI_ADAPTERS: Record<CliType, {
  label: string;
  defaultCommand: string;
  installUrl: string;
  loginHint: string;
}> = {
  claude: {
    label: "Claude Code",
    defaultCommand: "claude",
    installUrl: "https://docs.anthropic.com/claude-code",
    loginHint: "claude auth login",
  },
  codex: {
    label: "Codex CLI",
    defaultCommand: "codex",
    installUrl: "https://github.com/openai/codex",
    loginHint: "codex login",
  },
  gemini: {
    label: "Gemini CLI",
    defaultCommand: "gemini",
    installUrl: "https://github.com/google-gemini/gemini-cli",
    loginHint: "gemini auth",
  },
};

function buildArgs(cliType: CliType, prompt: string, sessionId?: string): { args: string[]; stdinPrompt: string | null } {
  switch (cliType) {
    case "claude":
      return {
        args: [
          "--print", prompt,
          "--output-format", "stream-json",
          ...(sessionId ? ["--resume", sessionId] : []),
        ],
        stdinPrompt: null,
      };

    case "codex": {
      const args = ["exec", "--json"];
      if (sessionId) args.push("resume", sessionId, "-");
      else args.push("-");
      return { args, stdinPrompt: prompt };
    }

    case "gemini":
      return {
        args: [
          "--output-format", "stream-json",
          "--approval-mode", "yolo",
          "--sandbox=none",
          "--prompt", prompt,
          ...(sessionId ? ["--resume", sessionId] : []),
        ],
        stdinPrompt: null,
      };
  }
}

export type SpawnResult = {
  exitCode: number;
  chunks: ParsedChunk[];
  fullOutput: string;
};

export async function spawnCli(
  cliType: CliType,
  command: string,
  prompt: string,
  options?: {
    sessionId?: string;
    mcpTools?: string[];
    onChunk?: (chunk: ParsedChunk) => void;
    signal?: AbortSignal;
    env?: Record<string, string>;
  }
): Promise<SpawnResult> {
  const { args, stdinPrompt } = buildArgs(cliType, prompt, options?.sessionId);

  return new Promise((resolve, reject) => {
    const child: ChildProcess = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...(options?.env ?? {}) },
    });

    if (stdinPrompt) {
      child.stdin?.write(stdinPrompt);
      child.stdin?.end();
    }

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
