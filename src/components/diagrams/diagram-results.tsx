"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Copy,
  Check,
  AlertTriangle,
  Wand2,
  Loader2,
  Send,
  CheckCircle2,
  History,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MermaidPreview } from "./mermaid-preview";
import { useSSEInline } from "@/hooks/use-sse-inline";
import type { Diagram } from "@/types/diagram";

interface DiagramResultsProps {
  jobId: string;
  diagrams: Diagram[];
}

interface VersionInfo {
  id: string;
  version: number;
  instruction: string | null;
  mermaidCode: string;
  isConfirmed: boolean;
  createdAt: string;
}

interface DiagramState {
  currentVersionIndex: number;
  versions: VersionInfo[];
  error: string | null;
  fixing: boolean;
  fixAttempts: number;
  improving: boolean;
  loaded: boolean;
}

const PLUGIN_ID = "1618296186536480339";

export function DiagramResults({ jobId, diagrams }: DiagramResultsProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<Record<string, string>>({});
  const [diagramStates, setDiagramStates] = useState<
    Record<string, DiagramState>
  >({});

  // SSE 스트리밍 훅 — fix/improve 시 실시간 진행 표시
  const fixSSE = useSSEInline<{ fixedCode: string; nodes: unknown[]; edges: unknown[] }>("/api/fix-mermaid");
  const improveSSE = useSSEInline<{ improvedCode: string; nodes: unknown[]; edges: unknown[] }>("/api/improve-diagram");

  // 각 다이어그램의 버전 히스토리를 DB에서 로드
  useEffect(function () {
    diagrams.forEach(function (d) {
      loadVersions(d.title, d.mermaidCode, d.nodes || [], d.edges || []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadVersions(title: string, currentCode: string, initialNodes: unknown[], initialEdges: unknown[]) {
    try {
      const res = await fetch(
        "/api/diagram-versions?jobId=" +
          encodeURIComponent(jobId) +
          "&title=" +
          encodeURIComponent(title)
      );
      const data = await res.json();
      const versions: VersionInfo[] = data.versions || [];

      if (versions.length === 0) {
        // 초기 버전이 없으면 생성
        const createRes = await fetch("/api/diagram-versions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId,
            diagramTitle: title,
            mermaidCode: currentCode,
            nodes: initialNodes,
            edges: initialEdges,
            instruction: null,
          }),
        });
        const created = await createRes.json();
        versions.push(created.version);
      }

      // 확정된 버전 또는 최신 버전의 인덱스
      const confirmedIdx = versions.findIndex(function (v) {
        return v.isConfirmed;
      });
      const currentIdx = confirmedIdx >= 0 ? confirmedIdx : versions.length - 1;

      setDiagramStates(function (prev) {
        return {
          ...prev,
          [title]: {
            currentVersionIndex: currentIdx,
            versions: versions,
            error: null,
            fixing: false,
            fixAttempts: 0,
            improving: false,
            loaded: true,
          },
        };
      });
    } catch {
      setDiagramStates(function (prev) {
        return {
          ...prev,
          [title]: {
            currentVersionIndex: 0,
            versions: [
              {
                id: "local",
                version: 1,
                instruction: null,
                mermaidCode: currentCode,
                isConfirmed: false,
                createdAt: new Date().toISOString(),
              },
            ],
            error: null,
            fixing: false,
            fixAttempts: 0,
            improving: false,
            loaded: true,
          },
        };
      });
    }
  }

  function getCurrentCode(title: string): string {
    const state = diagramStates[title];
    if (!state || !state.versions || state.versions.length === 0) {
      const d = diagrams.find(function (dd) {
        return dd.title === title;
      });
      return d?.mermaidCode || "";
    }
    return state.versions[state.currentVersionIndex]?.mermaidCode || "";
  }

  function getCurrentVersion(title: string): VersionInfo | null {
    const state = diagramStates[title];
    if (!state || !state.versions || state.versions.length === 0) return null;
    return state.versions[state.currentVersionIndex] || null;
  }

  const handleCopy = async function (code: string, title: string) {
    await navigator.clipboard.writeText(code);
    setCopied(title);
    setTimeout(function () {
      setCopied(null);
    }, 2000);
  };

  const handleRenderError = useCallback(function (title: string, err: string) {
    setDiagramStates(function (prev) {
      if (prev[title]?.error === err) return prev;
      return { ...prev, [title]: { ...prev[title], error: err } };
    });
  }, []);

  const handleRenderSuccess = useCallback(function (title: string) {
    setDiagramStates(function (prev) {
      if (prev[title]?.error === null) return prev;
      return { ...prev, [title]: { ...prev[title], error: null } };
    });
  }, []);

  // AI 구문 오류 수정 (SSE 스트리밍)
  async function handleFixWithAI(title: string) {
    const state = diagramStates[title];
    if (!state || state.fixing) return;

    setDiagramStates(function (prev) {
      return { ...prev, [title]: { ...prev[title], fixing: true } };
    });

    try {
      const currentCode = getCurrentCode(title);
      const data = await fixSSE.execute({ code: currentCode, error: state.error });

      // 새 버전으로 저장
      const vRes = await fetch("/api/diagram-versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          diagramTitle: title,
          mermaidCode: data.fixedCode,
          nodes: data.nodes || [],
          edges: data.edges || [],
          instruction: "구문 오류 자동 수정",
        }),
      });
      const vData = await vRes.json();

      setDiagramStates(function (prev) {
        const newVersions = [...prev[title].versions, vData.version];
        return {
          ...prev,
          [title]: {
            ...prev[title],
            versions: newVersions,
            currentVersionIndex: newVersions.length - 1,
            error: null,
            fixing: false,
            fixAttempts: prev[title].fixAttempts + 1,
          },
        };
      });
    } catch {
      setDiagramStates(function (prev) {
        return {
          ...prev,
          [title]: {
            ...prev[title],
            fixing: false,
            fixAttempts: prev[title].fixAttempts + 1,
          },
        };
      });
    }
  }

  // AI 개선 요청 (SSE 스트리밍)
  async function handleImprove(title: string) {
    const state = diagramStates[title];
    const instruction = instructions[title];
    if (!state || !instruction?.trim() || state.improving) return;

    setDiagramStates(function (prev) {
      return { ...prev, [title]: { ...prev[title], improving: true } };
    });

    try {
      const currentCode = getCurrentCode(title);
      const data = await improveSSE.execute({
        code: currentCode,
        instruction: instruction.trim(),
      });

      // 새 버전으로 저장
      const vRes = await fetch("/api/diagram-versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          diagramTitle: title,
          mermaidCode: data.improvedCode,
          nodes: data.nodes || [],
          edges: data.edges || [],
          instruction: instruction.trim(),
        }),
      });
      const vData = await vRes.json();

      setDiagramStates(function (prev) {
        const newVersions = [...prev[title].versions, vData.version];
        return {
          ...prev,
          [title]: {
            ...prev[title],
            versions: newVersions,
            currentVersionIndex: newVersions.length - 1,
            error: null,
            improving: false,
          },
        };
      });

      setInstructions(function (prev) {
        return { ...prev, [title]: "" };
      });
    } catch {
      setDiagramStates(function (prev) {
        return { ...prev, [title]: { ...prev[title], improving: false } };
      });
    }
  }

  // 버전 이동
  function goToVersion(title: string, index: number) {
    setDiagramStates(function (prev) {
      const state = prev[title];
      if (!state || index < 0 || index >= state.versions.length) return prev;
      return {
        ...prev,
        [title]: { ...state, currentVersionIndex: index, error: null },
      };
    });
  }

  // 현재 버전을 확정
  async function handleConfirm(title: string) {
    const state = diagramStates[title];
    if (!state) return;
    const version = state.versions[state.currentVersionIndex];
    if (!version) return;

    await fetch("/api/diagram-versions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId,
        diagramTitle: title,
        versionId: version.id,
      }),
    });

    setDiagramStates(function (prev) {
      const newVersions = prev[title].versions.map(function (v, i) {
        return {
          ...v,
          isConfirmed: i === prev[title].currentVersionIndex,
        };
      });
      return {
        ...prev,
        [title]: { ...prev[title], versions: newVersions },
      };
    });
  }

  return (
    <Tabs defaultValue={diagrams[0]?.title} className="min-w-0">
      <div className="overflow-x-auto rounded-lg border bg-muted/50 p-1">
        <div className="flex w-max gap-1">
          <TabsList className="h-auto flex-none gap-1 bg-transparent p-0">
            {diagrams.map(function (d) {
              const state = diagramStates[d.title];
              return (
                <TabsTrigger
                  key={d.title}
                  value={d.title}
                  className="shrink-0 whitespace-nowrap gap-1.5"
                >
                  {state?.error && (
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                  )}
                  {d.title}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
      </div>

      {diagrams.map(function (diagram) {
        const state = diagramStates[diagram.title];
        const currentCode = getCurrentCode(diagram.title);
        const currentVer = getCurrentVersion(diagram.title);
        const canUndo =
          state && state.versions && state.currentVersionIndex > 0;
        const canRedo =
          state &&
          state.versions &&
          state.currentVersionIndex < state.versions.length - 1;

        return (
          <TabsContent key={diagram.title} value={diagram.title}>
            {/* 버전 내비게이션 바 */}
            {state && state.versions && state.versions.length > 0 && (
              <div className="mb-4 flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    버전 {(state.currentVersionIndex + 1)} / {state.versions.length}
                  </span>
                  {currentVer?.instruction && (
                    <span className="text-xs text-muted-foreground">
                      — &quot;{currentVer.instruction}&quot;
                    </span>
                  )}
                  {!currentVer?.instruction && currentVer?.version === 1 && (
                    <span className="text-xs text-muted-foreground">
                      — 초기 생성
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!canUndo}
                    onClick={function () {
                      goToVersion(
                        diagram.title,
                        state.currentVersionIndex - 1
                      );
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {/* 버전 도트 */}
                  <div className="flex items-center gap-1 px-1">
                    {state.versions.filter(Boolean).map(function (v, i) {
                      const isCurrent = i === state.currentVersionIndex;
                      const isConfirmed = v?.isConfirmed || false;
                      return (
                        <button
                          key={v.id}
                          onClick={function () {
                            goToVersion(diagram.title, i);
                          }}
                          className={
                            "h-2.5 w-2.5 rounded-full transition-all " +
                            (isCurrent
                              ? "scale-125 bg-primary"
                              : isConfirmed
                                ? "bg-green-500"
                                : "bg-muted-foreground/30 hover:bg-muted-foreground/50")
                          }
                          title={
                            "v" +
                            v.version +
                            (v.instruction ? ": " + v.instruction : "") +
                            (isConfirmed ? " (확정)" : "")
                          }
                        />
                      );
                    })}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!canRedo}
                    onClick={function () {
                      goToVersion(
                        diagram.title,
                        state.currentVersionIndex + 1
                      );
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>

                  {/* 확정 버튼 */}
                  {currentVer?.isConfirmed ? (
                    <Badge className="ml-2 gap-1 bg-green-600 text-xs">
                      <CheckCircle2 className="h-3 w-3" />
                      확정됨
                    </Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2 text-xs"
                      onClick={function () {
                        handleConfirm(diagram.title);
                      }}
                    >
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      이 버전으로 확정
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Preview */}
              <Card className="min-w-0 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">미리보기</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <MermaidPreview
                    code={currentCode}
                    onRenderError={function (err) {
                      handleRenderError(diagram.title, err);
                    }}
                    onRenderSuccess={function () {
                      handleRenderSuccess(diagram.title);
                    }}
                  />

                  {state?.error && (
                    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <div className="min-w-0 text-xs">
                          <p className="font-medium text-amber-800">
                            Mermaid 구문 오류
                          </p>
                          <p className="mt-1 rounded bg-amber-100 px-2 py-1 font-mono text-[10px] text-amber-900">
                            {state.error.length > 150
                              ? state.error.slice(0, 150) + "..."
                              : state.error}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={function () {
                          handleFixWithAI(diagram.title);
                        }}
                        disabled={state.fixing || state.fixAttempts >= 3 || fixSSE.isStreaming}
                      >
                        {state.fixing ? (
                          <>
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            AI가 수정 중...{fixSSE.charsReceived > 0 && ` (${(fixSSE.charsReceived / 1024).toFixed(1)} KB)`}
                          </>
                        ) : state.fixAttempts >= 3 ? (
                          "최대 수정 횟수 초과"
                        ) : (
                          <>
                            <Wand2 className="mr-2 h-3.5 w-3.5" />
                            AI로 구문 오류 수정하기
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Code */}
              <Card className="min-w-0 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Mermaid 코드</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={function () {
                      handleCopy(currentCode, diagram.title);
                    }}
                  >
                    {copied === diagram.title ? (
                      <Check className="mr-2 h-4 w-4" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    {copied === diagram.title ? "복사됨" : "코드 복사"}
                  </Button>
                </CardHeader>
                <CardContent>
                  <pre className="max-h-[500px] overflow-auto rounded-md bg-muted p-4 text-xs">
                    {currentCode}
                  </pre>
                  <div className="mt-4 space-y-2">
                    <Button
                      className="w-full gap-2"
                      onClick={async function () {
                        await navigator.clipboard.writeText(`FIREQA_JOB:${jobId}`);
                        // figma:// 딥링크 시도 — 미설치 시 커뮤니티 페이지로 fallback
                        const figmaUrl = `https://www.figma.com/community/plugin/${PLUGIN_ID}`;
                        window.open(figmaUrl, "_blank");
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                      FigJam에서 열기
                    </Button>
                    <p className="text-center text-[10px] text-muted-foreground">
                      클릭하면 작업 ID가 클립보드에 복사됩니다 → 플러그인에서 &quot;웹에서 가져오기&quot; 클릭
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI 개선 요청 */}
            <Card className="mt-4 min-w-0 overflow-hidden border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wand2 className="h-4 w-4 text-primary" />
                  AI에게 수정 요청
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  placeholder={
                    '예시:\n- "에러 처리 플로우를 추가해줘"\n- "로그아웃 노드가 빠졌어, 추가해줘"\n- "관리자와 사용자 플로우를 색으로 구분해줘"\n- "이 다이어그램을 좌우 방향으로 바꿔줘"'
                  }
                  value={instructions[diagram.title] || ""}
                  onChange={function (e) {
                    setInstructions(function (prev) {
                      return { ...prev, [diagram.title]: e.target.value };
                    });
                  }}
                  rows={3}
                  className="text-sm"
                  onKeyDown={function (e) {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleImprove(diagram.title);
                    }
                  }}
                />
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">
                    Cmd+Enter로 전송 · 새 버전이 자동 저장됩니다
                  </p>
                  <Button
                    size="sm"
                    onClick={function () {
                      handleImprove(diagram.title);
                    }}
                    disabled={
                      !instructions[diagram.title]?.trim() ||
                      state?.improving ||
                      improveSSE.isStreaming
                    }
                  >
                    {state?.improving ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        수정 중...{improveSSE.charsReceived > 0 && ` (${(improveSSE.charsReceived / 1024).toFixed(1)} KB)`}
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-3.5 w-3.5" />
                        AI에게 요청
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
