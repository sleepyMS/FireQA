"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Check, Wifi, WifiOff, Loader2, Bot, Server, Plus, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAIConfig } from "@/hooks/use-ai-config";
import { MODEL_OPTIONS } from "@/components/model-selector";
import { AGENT_MODEL_OPTIONS } from "@/hooks/use-agent-model";
import type { AgentConnectionView } from "@/types/agent";
import SettingsAgent from "@/app/(dashboard)/[orgSlug]/settings/settings-agent";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CLI_LABELS: Record<string, string> = {
  claude: "Claude Code",
  codex: "Codex CLI",
  gemini: "Gemini CLI",
};

function connMeta(meta: { cli?: string; os?: string; version?: string }) {
  return [meta?.cli, meta?.os, meta?.version ? `v${meta.version}` : null].filter(Boolean).join(" · ");
}

export default function AccountAI() {
  const { config, isLoading, save } = useAIConfig();

  const [draft, setDraft] = useState({
    executionMode: config.executionMode,
    serverModel: config.serverModel,
    agentConnectionId: config.agentConnectionId,
    agentModel: config.agentModel,
  });

  const { data: connData, mutate: mutateConns } = useSWR<{ connections: AgentConnectionView[] }>(
    draft.executionMode === "agent" ? "/api/agent/connections" : null,
    fetcher,
    { refreshInterval: 10000, revalidateOnFocus: true }
  );
  const connections = connData?.connections ?? [];

  useEffect(() => {
    setDraft({
      executionMode: config.executionMode,
      serverModel: config.serverModel,
      agentConnectionId: config.agentConnectionId,
      agentModel: config.agentModel,
    });
  }, [config.executionMode, config.serverModel, config.agentConnectionId, config.agentModel]);

  const [saving, setSaving] = useState(false);

  // 위저드: 첫 로드 시 연결 없으면 기본 펼침, 있으면 기본 접힘
  const [showWizard, setShowWizard] = useState(false);
  const wizardInitialized = useRef(false);
  useEffect(() => {
    if (connData !== undefined && !wizardInitialized.current) {
      wizardInitialized.current = true;
      setShowWizard(connData.connections.length === 0);
    }
  }, [connData]);

  // 연결 해제 다이얼로그
  const [deleteTarget, setDeleteTarget] = useState<AgentConnectionView | null>(null);
  const [deleting, setDeleting] = useState(false);

  const selectedConn = connections.find((c) => c.id === draft.agentConnectionId);
  const cliType = (selectedConn?.metadata as { cli?: string } | undefined)?.cli as keyof typeof AGENT_MODEL_OPTIONS | undefined;
  const agentModels = cliType && cliType in AGENT_MODEL_OPTIONS
    ? AGENT_MODEL_OPTIONS[cliType]
    : Object.values(AGENT_MODEL_OPTIONS).flat();

  async function handleSave() {
    setSaving(true);
    await save(draft);
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/agent/connections/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "연결 해제에 실패했습니다.");
        return;
      }
      await mutateConns();
      toast.success(`${deleteTarget.name} 연결이 해제되었습니다.`);
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> 설정 불러오는 중...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── 현재 AI 설정 요약 ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">현재 AI 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-24 shrink-0">실행 방식</span>
            <span className="font-medium">
              {config.executionMode === "agent" ? "내 에이전트" : "서버 LLM"}
            </span>
          </div>
          {config.executionMode === "server" && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-24 shrink-0">모델</span>
              <span className="font-medium">
                {MODEL_OPTIONS.find((m) => m.value === config.serverModel)?.label ?? config.serverModel}
              </span>
            </div>
          )}
          {config.executionMode === "agent" && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-24 shrink-0">에이전트</span>
                {config.agentConnection ? (
                  <span className="flex items-center gap-1.5 font-medium">
                    {config.agentConnection.status === "online"
                      ? <Wifi className="h-3.5 w-3.5 text-green-500" />
                      : <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />}
                    {config.agentConnection.name}
                    <Badge className={cn(
                      "text-[10px] px-1.5 py-0",
                      config.agentConnection.status === "online"
                        ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {config.agentConnection.status === "online" ? "온라인" : "오프라인"}
                    </Badge>
                  </span>
                ) : (
                  <span className="text-muted-foreground">미설정</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-24 shrink-0">모델</span>
                <span className="font-medium">{config.agentModel ?? "미설정"}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── AI 실행 방식 편집 ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">AI 실행 방식 편집</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* 모드 토글 */}
          <div className="grid grid-cols-2 gap-2">
            {(["agent", "server"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, executionMode: mode }))}
                className={cn(
                  "flex items-center gap-2 rounded-lg border-2 p-3 text-left text-sm transition-all",
                  draft.executionMode === mode ? "border-primary bg-primary/5" : "border-transparent bg-muted/50 hover:bg-muted"
                )}
              >
                {mode === "agent"
                  ? <Bot className={cn("h-5 w-5 shrink-0", draft.executionMode === mode ? "text-primary" : "text-muted-foreground")} />
                  : <Server className={cn("h-5 w-5 shrink-0", draft.executionMode === mode ? "text-primary" : "text-muted-foreground")} />}
                <div>
                  <p className="font-medium">{mode === "agent" ? "내 에이전트" : "서버 LLM"}</p>
                  <p className="text-xs text-muted-foreground">{mode === "agent" ? "로컬 CLI 사용" : "빠른 스트리밍"}</p>
                </div>
              </button>
            ))}
          </div>

          {/* 서버 모드: 모델 선택 */}
          {draft.executionMode === "server" && (
            <div className="space-y-2">
              <p className="text-sm font-medium">모델 선택</p>
              <div className="flex flex-wrap gap-2">
                {MODEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, serverModel: opt.value }))}
                    className={cn(
                      "flex flex-col items-start rounded-lg border-2 px-3 py-2 text-left text-sm transition-all",
                      draft.serverModel === opt.value ? "border-primary bg-primary/5" : "border-transparent bg-muted/50 hover:bg-muted"
                    )}
                  >
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 에이전트 모드: 활성 에이전트 선택 + 모델 선택 */}
          {draft.executionMode === "agent" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">활성 에이전트 선택</p>
                {connections.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    연결된 에이전트가 없습니다. 아래 &quot;에이전트 연결 관리&quot;에서 추가하세요.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {connections.map((conn) => {
                      const meta = conn.metadata as { cli?: string; os?: string; version?: string };
                      const isSelected = draft.agentConnectionId === conn.id;
                      return (
                        <button
                          key={conn.id}
                          type="button"
                          onClick={() => {
                            const cli = (conn.metadata as { cli?: string })?.cli as keyof typeof AGENT_MODEL_OPTIONS | undefined;
                            const defaultModel = cli && cli in AGENT_MODEL_OPTIONS ? AGENT_MODEL_OPTIONS[cli][0].value : null;
                            setDraft((d) => ({ ...d, agentConnectionId: conn.id, agentModel: defaultModel }));
                          }}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-left transition-all",
                            isSelected ? "border-primary bg-primary/5" : "border-transparent bg-muted/40 hover:bg-muted"
                          )}
                        >
                          <div className={cn("h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0", isSelected ? "border-primary" : "border-muted-foreground/40")}>
                            {isSelected && <div className="h-2 w-2 rounded-full bg-primary" />}
                          </div>
                          {conn.status === "online"
                            ? <Wifi className="h-4 w-4 text-green-500 shrink-0" />
                            : <WifiOff className="h-4 w-4 text-muted-foreground shrink-0" />}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{conn.name}</p>
                            <p className="text-xs text-muted-foreground">{connMeta(meta)}</p>
                          </div>
                          <Badge className={cn(
                            conn.status === "online"
                              ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300"
                              : "bg-muted text-muted-foreground"
                          )}>
                            {conn.status === "online" ? "온라인" : "오프라인"}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {draft.agentConnectionId && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    모델 선택
                    {cliType && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        ({CLI_LABELS[cliType] ?? cliType} 전용)
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {agentModels.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, agentModel: opt.value }))}
                        className={cn(
                          "flex flex-col items-start rounded-lg border-2 px-3 py-2 text-left text-sm transition-all",
                          draft.agentModel === opt.value ? "border-primary bg-primary/5" : "border-transparent bg-muted/50 hover:bg-muted"
                        )}
                      >
                        <span className="font-medium">{opt.label}</span>
                        <span className="text-xs text-muted-foreground">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 저장 중...</>
              : <><Check className="mr-2 h-4 w-4" /> 설정 저장</>}
          </Button>
        </CardContent>
      </Card>

      {/* ── 에이전트 연결 관리 (에이전트 모드일 때만) ── */}
      {draft.executionMode === "agent" && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">에이전트 연결 관리</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWizard((v) => !v)}
              className="gap-1.5 shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              새 에이전트 추가
              {showWizard ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </CardHeader>
          <CardContent className="space-y-0">
            {/* 연결 목록 */}
            {connections.length === 0 && !showWizard && (
              <p className="text-sm text-muted-foreground py-2">연결된 에이전트가 없습니다.</p>
            )}
            {connections.length > 0 && (
              <div className="divide-y">
                {connections.map((conn) => (
                  <div key={conn.id} className="flex items-center gap-3 py-3 first:pt-0">
                    {conn.status === "online"
                      ? <Wifi className="h-4 w-4 text-green-500 shrink-0" />
                      : <WifiOff className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{conn.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {connMeta(conn.metadata as { cli?: string; os?: string; version?: string })}
                      </p>
                    </div>
                    <Badge className={cn(
                      conn.status === "online"
                        ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {conn.status === "online" ? "온라인" : "오프라인"}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(conn)} title="연결 해제">
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* 등록 위저드 (펼쳤을 때) */}
            {showWizard && (
              <div className={cn(connections.length > 0 && "border-t pt-4")}>
                <SettingsAgent hideConnectionsList alwaysStartFresh />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 연결 해제 확인 다이얼로그 */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v && !deleting) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>에이전트 연결 해제</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{deleteTarget?.name}</span> 연결을 해제하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>취소</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "해제 중..." : "연결 해제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
