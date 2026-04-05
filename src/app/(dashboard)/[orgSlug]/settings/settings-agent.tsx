"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Check, CheckCircle2, ChevronDown, ChevronRight, Copy, Loader2, Trash2, Wifi, WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AgentConnectionView } from "@/types/agent";

// ─── CLI 정의 ───────────────────────────────────────────────────────────────

const CLI_OPTIONS = [
  {
    type: "claude" as const,
    label: "Claude Code",
    vendor: "Anthropic",
    desc: "가장 강력한 코딩 AI. Anthropic 계정으로 무료 사용 가능.",
    loginCmd: "claude auth login",
    startCmd: "npx fireqa-agent@latest start",
    installUrl: "https://docs.anthropic.com/claude-code",
  },
  {
    type: "codex" as const,
    label: "Codex CLI",
    vendor: "OpenAI",
    desc: "OpenAI GPT 기반 CLI. OpenAI 계정 필요.",
    loginCmd: "codex login",
    startCmd: "npx fireqa-agent@latest start --cli-type codex",
    installUrl: "https://github.com/openai/codex",
  },
  {
    type: "gemini" as const,
    label: "Gemini CLI",
    vendor: "Google",
    desc: "Google Gemini 기반 CLI. Google 계정으로 무료 사용 가능.",
    loginCmd: "gemini auth",
    startCmd: "npx fireqa-agent@latest start --cli-type gemini",
    installUrl: "https://github.com/google-gemini/gemini-cli",
  },
] as const;

type CliType = (typeof CLI_OPTIONS)[number]["type"];

const STEPS = ["CLI 선택", "설치 & 로그인", "에이전트 시작"] as const;

// ─── 유틸 ───────────────────────────────────────────────────────────────────

function connMeta(m: AgentConnectionView["metadata"]) {
  return [m?.cli, m?.os, m?.version ? `v${m.version}` : null].filter(Boolean).join(" · ");
}

// ─── 코드 블록 ──────────────────────────────────────────────────────────────

function CodeBlock({ lines }: { lines: { comment: string; cmd: string }[] }) {
  const [copied, setCopied] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const copy = (cmd: string, idx: number) => {
    navigator.clipboard.writeText(cmd).then(() => {
      setCopied(idx);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(null), 1800);
    });
  };

  return (
    <div className="rounded-lg border bg-zinc-950 p-4 font-mono text-xs text-zinc-100 space-y-3">
      {lines.map((line, i) => (
        <div key={i}>
          <p className="text-zinc-500 mb-1"># {line.comment}</p>
          <div className="flex items-center gap-2 group">
            <p className="flex-1 text-green-400">{line.cmd}</p>
            <button
              onClick={() => copy(line.cmd, i)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-200"
            >
              {copied === i ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── pm2 백그라운드 안내 ──────────────────────────────────────────────────────

function Pm2Guide({ startCmd }: { startCmd: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-dashed">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>터미널을 닫아도 에이전트를 유지하려면?</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t px-3 pb-3 pt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">pm2</strong>를 사용하면 터미널을 닫아도 에이전트가 백그라운드에서 계속 실행됩니다.
          </p>
          <CodeBlock
            lines={[
              { comment: "pm2 설치 (최초 1회)", cmd: "npm install -g pm2" },
              { comment: "백그라운드로 에이전트 시작", cmd: `pm2 start "${startCmd}" --name fireqa-agent` },
              { comment: "재부팅 후 자동 시작 설정 (선택)", cmd: "pm2 save && pm2 startup" },
            ]}
          />
        </div>
      )}
    </div>
  );
}

// ─── 단계 표시기 ────────────────────────────────────────────────────────────

function StepIndicator({ current, done }: { current: number; done: boolean }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((label, i) => {
        const idx = i + 1;
        const isCompleted = done || idx < current;
        const isActive = !done && idx === current;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground"
                    : isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-muted-foreground/30 text-muted-foreground/50"
                )}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : idx}
              </div>
              <span className={cn("text-[10px] whitespace-nowrap", isActive ? "text-primary font-medium" : "text-muted-foreground")}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("h-px w-12 mx-1 mb-4 transition-colors", idx < current || done ? "bg-primary" : "bg-muted-foreground/20")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────────────────────

export default function SettingsAgent({
  hideConnectionsList = false,
  alwaysStartFresh = false,
}: {
  hideConnectionsList?: boolean;
  /** true면 기존 연결이 있어도 step 1부터 시작 (새 에이전트 추가 전용) */
  alwaysStartFresh?: boolean;
}) {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  const [step, setStep] = useState(1);
  const [selectedCli, setSelectedCli] = useState<CliType>("claude");
  const [connections, setConnections] = useState<AgentConnectionView[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [disconnectTarget, setDisconnectTarget] = useState<AgentConnectionView | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // step 3 진입 시 이미 온라인인 연결 ID 스냅샷 — 새 연결만 감지
  const knownOnlineIdsRef = useRef<Set<string>>(new Set());

  const onlineConnections = connections.filter((c) => c.status === "online");
  const cli = CLI_OPTIONS.find((c) => c.type === selectedCli)!;

  async function loadConnections() {
    const res = await fetch("/api/agent/connections");
    const data = await res.json();
    const list: AgentConnectionView[] = data.connections ?? [];
    setConnections(list);
    return list;
  }

  useEffect(() => {
    loadConnections()
      .then((list) => {
        if (!alwaysStartFresh && list.some((c) => c.status === "online")) setStep(4);
      })
      .catch(() => {})
      .finally(() => setLoadingConnections(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // step 3 진입/이탈 시 polling 관리
  useEffect(() => {
    if (step !== 3) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    // step 3 진입 시 현재 온라인 연결 ID를 스냅샷 (기존 연결로 오탐 방지)
    knownOnlineIdsRef.current = new Set(
      connections.filter((c) => c.status === "online").map((c) => c.id)
    );
    pollRef.current = setInterval(async () => {
      try {
        const list = await loadConnections();
        const hasNew = list.some(
          (c) => c.status === "online" && !knownOnlineIdsRef.current.has(c.id)
        );
        if (hasNew) {
          clearInterval(pollRef.current!);
          setStep(4);
        }
      } catch {}
    }, 2500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  async function confirmDisconnect() {
    if (!disconnectTarget) return;
    setDisconnecting(true);
    try {
      const res = await fetch(`/api/agent/connections/${disconnectTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "연결 해제에 실패했습니다.");
        return;
      }
      setConnections((prev) => {
        const updated = prev.filter((c) => c.id !== disconnectTarget.id);
        if (!updated.some((c) => c.status === "online") && step === 4) setStep(3);
        return updated;
      });
      toast.success(`${disconnectTarget.name} 연결이 해제되었습니다.`);
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setDisconnecting(false);
      setDisconnectTarget(null);
    }
  }

  const isConnected = step === 4 && onlineConnections.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">에이전트 설정</CardTitle>
        </CardHeader>
        <CardContent>
          <StepIndicator current={step} done={isConnected} />

          {/* Step 1: CLI 선택 */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                사용할 AI CLI를 선택하세요. 선택한 CLI가 설치된 상태여야 합니다.
              </p>
              <div className="grid gap-3">
                {CLI_OPTIONS.map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => setSelectedCli(opt.type)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all",
                      selectedCli === opt.type
                        ? "border-primary bg-primary/5"
                        : "border-transparent bg-muted/40 hover:bg-muted"
                    )}
                  >
                    <div className={cn("mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0", selectedCli === opt.type ? "border-primary" : "border-muted-foreground/40")}>
                      {selectedCli === opt.type && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{opt.label}</span>
                        <span className="text-xs text-muted-foreground">{opt.vendor}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <Button onClick={() => setStep(2)} className="w-full">
                {cli.label} 선택 <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 2: 설치 & 로그인 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{cli.label} 설치 및 로그인</p>
                <Link href={cli.installUrl} target="_blank" className="text-xs text-primary hover:underline">
                  설치 가이드 →
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">
                터미널에서 아래 명령어를 실행해 {cli.label}에 로그인하세요.
              </p>
              <CodeBlock lines={[{ comment: `${cli.label} 로그인`, cmd: cli.loginCmd }]} />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>이전</Button>
                <Button onClick={() => setStep(3)} className="flex-1">
                  로그인 완료 <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: 에이전트 시작 + 자동 감지 */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                터미널에서 아래 두 명령어를 순서대로 실행하세요. 연결되면 자동으로 감지됩니다.
              </p>
              <CodeBlock
                lines={[
                  { comment: "FireQA 에이전트 로그인 (최초 1회)", cmd: "npx fireqa-agent login" },
                  { comment: "에이전트 시작", cmd: cli.startCmd },
                ]}
              />
              <Pm2Guide startCmd={cli.startCmd} />
              <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>에이전트 연결 대기 중...</span>
              </div>
              <Button variant="outline" onClick={() => setStep(2)} size="sm">이전</Button>
            </div>
          )}

          {/* Step 4: 연결 완료 */}
          {isConnected && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">에이전트 연결됨</p>
                  <p className="text-xs text-green-700 dark:text-green-300">생성 기능에서 &quot;내 에이전트&quot; 모드를 선택해 사용하세요.</p>
                </div>
              </div>

              <div className="space-y-2">
                {onlineConnections.map((conn) => (
                  <div key={conn.id} className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
                    <Wifi className="h-4 w-4 text-green-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{conn.name}</p>
                      <p className="text-xs text-muted-foreground">{connMeta(conn.metadata)}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800">온라인</Badge>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Link href={`/${orgSlug}/generate`} className="flex-1">
                  <Button className="w-full">TC 생성 시작하기 →</Button>
                </Link>
                <Button variant="outline" onClick={() => setStep(1)} size="sm">추가 연결</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!hideConnectionsList && connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">연결 목록</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingConnections ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> 로딩 중...
              </div>
            ) : (
              <div className="divide-y">
                {connections.map((conn) => (
                  <div key={conn.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    {conn.status === "online"
                      ? <Wifi className="h-4 w-4 text-green-500 shrink-0" />
                      : <WifiOff className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{conn.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{connMeta(conn.metadata)}</p>
                    </div>
                    <Badge
                      variant={conn.status === "online" ? "default" : "secondary"}
                      className={cn(conn.status === "online" && "bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800")}
                    >
                      {conn.status === "online" ? "온라인" : "오프라인"}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => setDisconnectTarget(conn)} title="연결 해제">
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!disconnectTarget} onOpenChange={(v) => { if (!v && !disconnecting) setDisconnectTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>에이전트 연결 해제</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{disconnectTarget?.name}</span> 연결을 해제하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectTarget(null)} disabled={disconnecting}>
              취소
            </Button>
            <Button variant="destructive" onClick={confirmDisconnect} disabled={disconnecting}>
              {disconnecting ? "해제 중..." : "연결 해제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
