"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

const CLI_OPTIONS = [
  {
    type: "claude",
    label: "Claude Code",
    installCmd: "npm install -g @anthropic-ai/claude-code",
    loginCmd: "claude auth login",
    startCmd: "npx fireqa-agent start",
    installUrl: "https://docs.anthropic.com/claude-code",
  },
  {
    type: "codex",
    label: "Codex CLI",
    installCmd: "npm install -g @openai/codex",
    loginCmd: "codex login",
    startCmd: "npx fireqa-agent start --cli-type codex",
    installUrl: "https://github.com/openai/codex",
  },
  {
    type: "gemini",
    label: "Gemini CLI",
    installCmd: "npm install -g @google/gemini-cli",
    loginCmd: "gemini auth",
    startCmd: "npx fireqa-agent start --cli-type gemini",
    installUrl: "https://github.com/google-gemini/gemini-cli",
  },
] as const;

export function CliSelector() {
  const [selected, setSelected] = useState<"claude" | "codex" | "gemini">("claude");
  const cli = CLI_OPTIONS.find((c) => c.type === selected)!;

  return (
    <div className="space-y-4">
      {/* CLI 선택 탭 */}
      <div className="flex gap-2">
        {CLI_OPTIONS.map((c) => (
          <button
            key={c.type}
            onClick={() => setSelected(c.type)}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
              selected === c.type
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-accent"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* 선택된 CLI 명령어 */}
      <div className="rounded-lg border bg-zinc-950 p-4 font-mono text-xs text-zinc-100 space-y-3">
        <div>
          <p className="text-zinc-500 mb-1"># 1. {cli.label} 설치</p>
          <p className="text-green-400">{cli.installCmd}</p>
        </div>
        <div>
          <p className="text-zinc-500 mb-1"># 2. 로그인 (API 키 불필요)</p>
          <p className="text-green-400">{cli.loginCmd}</p>
        </div>
        <div>
          <p className="text-zinc-500 mb-1"># 3. FireQA 에이전트 로그인</p>
          <p className="text-green-400">npx fireqa-agent login</p>
        </div>
        <div>
          <p className="text-zinc-500 mb-1"># 4. 에이전트 시작</p>
          <p className="text-green-400">{cli.startCmd}</p>
        </div>
      </div>

      <a
        href={cli.installUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <ExternalLink className="h-3 w-3" />
        {cli.label} 설치 가이드
      </a>
    </div>
  );
}
