"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Trash2, ExternalLink, Terminal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AgentConnectionView } from "@/types/agent";

const CLI_OPTIONS = [
  {
    type: "claude",
    label: "Claude Code",
    command: "claude",
    installUrl: "https://docs.anthropic.com/claude-code",
    loginCmd: "claude auth login",
    startCmd: "npx fireqa-agent start",
  },
  {
    type: "codex",
    label: "Codex CLI",
    command: "codex",
    installUrl: "https://github.com/openai/codex",
    loginCmd: "codex login",
    startCmd: "npx fireqa-agent start --cli-type codex",
  },
  {
    type: "gemini",
    label: "Gemini CLI",
    command: "gemini",
    installUrl: "https://github.com/google-gemini/gemini-cli",
    loginCmd: "gemini auth",
    startCmd: "npx fireqa-agent start --cli-type gemini",
  },
] as const;

export default function SettingsAgent() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [connections, setConnections] = useState<AgentConnectionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCli, setSelectedCli] = useState<"claude" | "codex" | "gemini">("claude");

  useEffect(() => {
    fetch("/api/agent/connections")
      .then((r) => r.json())
      .then((data) => setConnections(data.connections ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDisconnect = async (id: string) => {
    if (!confirm("이 에이전트 연결을 해제하시겠습니까?")) return;
    await fetch(`/api/agent/connections/${id}`, { method: "DELETE" });
    setConnections((prev) => prev.filter((c) => c.id !== id));
  };

  const selected = CLI_OPTIONS.find((c) => c.type === selectedCli)!;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Terminal className="h-4 w-4" />
            연결된 에이전트
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">로딩 중...</p>
          ) : connections.length === 0 ? (
            <p className="text-sm text-muted-foreground">연결된 에이전트가 없습니다.</p>
          ) : (
            <div className="divide-y">
              {connections.map((conn) => (
                <div key={conn.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{conn.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {conn.metadata?.os ?? ""} · {conn.metadata?.cli ?? ""} · v{conn.metadata?.version ?? "?"}
                    </p>
                  </div>
                  <Badge variant={conn.status === "online" ? "default" : "secondary"}>
                    {conn.status === "online" ? "온라인" : "오프라인"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDisconnect(conn.id)}
                    title="연결 해제"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">에이전트 설정 가이드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            사용할 LLM CLI를 선택하세요. 해당 CLI가 설치되어 있고 로그인된 상태여야 합니다.
            API 키 등록 없이 본인 계정으로 동작합니다.
          </p>

          <div className="flex gap-2">
            {CLI_OPTIONS.map((cli) => (
              <button
                key={cli.type}
                onClick={() => setSelectedCli(cli.type)}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedCli === cli.type
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-accent"
                }`}
              >
                {cli.label}
              </button>
            ))}
          </div>

          <div className="rounded-lg border bg-zinc-950 p-4 font-mono text-xs text-zinc-100 space-y-3">
            <div>
              <p className="text-zinc-500 mb-1"># 1. {selected.label} 설치 및 로그인</p>
              <p className="text-green-400">{selected.loginCmd}</p>
            </div>
            <div>
              <p className="text-zinc-500 mb-1"># 2. FireQA 에이전트 로그인</p>
              <p className="text-green-400">npx fireqa-agent login</p>
            </div>
            <div>
              <p className="text-zinc-500 mb-1"># 3. 에이전트 시작</p>
              <p className="text-green-400">{selected.startCmd}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href={selected.installUrl}
              target="_blank"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              {selected.label} 설치 가이드
            </Link>
            <Link
              href={`/${orgSlug}/agent/guide`}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              FireQA 에이전트 가이드
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
