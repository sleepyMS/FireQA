"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { Wand2, FileText, Bot } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dropzone } from "@/components/upload/dropzone";
import { cn } from "@/lib/utils";
import { useSSE } from "@/hooks/use-sse";
import { GenerationProgress } from "@/components/generation-progress";
import { GenerationError } from "@/components/generation-error";
import { RecentJobsPanel } from "@/components/recent-jobs-panel";
import { ProjectSelector } from "@/components/projects/project-selector";
import type { SpecImproveResult } from "@/types/spec-improve";

type ProjectSelection =
  | { type: "existing"; id: string; name: string }
  | { type: "new"; name: string };

export default function ImprovePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  const [projectSelection, setProjectSelection] =
    useState<ProjectSelection | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedPreview, setParsedPreview] = useState<string | null>(null);

  const sse = useSSE<SpecImproveResult>("/api/improve");
  const [agentMode, setAgentMode] = useState(false);
  const [agentSubmitting, setAgentSubmitting] = useState(false);

  // URL searchParams에 projectId가 있으면 해당 프로젝트를 자동 선택
  useEffect(() => {
    const initialProjectId = searchParams.get("projectId");
    if (!initialProjectId) return;
    fetch(`/api/projects/${initialProjectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.project?.name) {
          setProjectSelection({
            type: "existing",
            id: initialProjectId,
            name: data.project.name,
          });
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 완료 시 결과 페이지로 리다이렉트
  useEffect(() => {
    if (sse.result && sse.jobId) {
      router.push(`${orgSlug ? `/${orgSlug}` : ""}/improve/${sse.jobId}`);
    }
  }, [sse.result, sse.jobId, router, orgSlug]);

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    const formData = new FormData();
    formData.append("file", selectedFile);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.parsedText) {
        setParsedPreview(
          data.parsedText.length > 2000
            ? data.parsedText.slice(0, 2000) + "..."
            : data.parsedText
        );
      }
    } catch {
      console.error("파일 파싱 실패");
    }
  };

  const handleAgentGenerate = async () => {
    if (!projectSelection || !parsedPreview) return;
    setAgentSubmitting(true);
    try {
      const projectId =
        projectSelection.type === "existing" ? projectSelection.id : undefined;
      const prompt = `다음 기획서를 개선해주세요:\n\n${parsedPreview}`;
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "improve-spec",
          projectId,
          prompt,
          context: {},
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "에이전트 작업 생성에 실패했습니다.");
        return;
      }
      router.push(`/${orgSlug}/agent/tasks/${data.id}`);
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setAgentSubmitting(false);
    }
  };

  const handleGenerate = () => {
    if (!file || !projectSelection) return;

    const formData = new FormData();
    formData.append("file", file);
    // 기존 프로젝트면 projectId, 새 프로젝트면 projectName 전달
    if (projectSelection.type === "existing") {
      formData.append("projectId", projectSelection.id);
    } else {
      formData.append("projectName", projectSelection.name);
    }
    formData.append("type", "spec-improve");

    sse.start(formData);
  };

  // 스트리밍 중이면 진행상태 표시
  if (sse.isStreaming) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">기획서 개선</h2>
          <p className="text-muted-foreground">
            {projectSelection?.name} — AI가 기획서를 개선하고 있습니다.
          </p>
        </div>
        <GenerationProgress
          stage={sse.stage}
          message={sse.message}
          progress={sse.progress}
          chunkInfo={sse.chunkInfo}
          charsReceived={sse.charsReceived}
          onCancel={sse.cancel}
        />
      </div>
    );
  }

  if (sse.error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">기획서 개선</h2>
        </div>
        <GenerationError error={sse.error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">기획서 개선</h2>
        <p className="text-muted-foreground">
          기획 문서를 업로드하면 AI가 모범 기획서 구조로 개선해 드립니다.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. 프로젝트 이름</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectSelector
                value={projectSelection}
                onChange={setProjectSelection}
                disabled={sse.isStreaming}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">2. 기획 문서 업로드</CardTitle>
            </CardHeader>
            <CardContent>
              <Dropzone onFileSelected={handleFileSelected} />
              {file && (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </CardContent>
          </Card>

          {/* 에이전트 모드 토글 */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">에이전트 모드</p>
                <p className="text-xs text-muted-foreground">로컬 Claude Code CLI로 작업 위임</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={agentMode}
              onClick={() => setAgentMode((v) => !v)}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                agentMode ? "bg-primary" : "bg-input"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg transition-transform",
                  agentMode ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {agentMode ? (
            <Button
              className="w-full"
              size="lg"
              disabled={!file || !projectSelection || !parsedPreview || agentSubmitting}
              onClick={handleAgentGenerate}
            >
              <Bot className="mr-2 h-4 w-4" />
              {agentSubmitting ? "에이전트에 전송 중..." : "에이전트로 기획서 개선하기"}
            </Button>
          ) : (
            <Button
              className="w-full"
              size="lg"
              disabled={!file || !projectSelection || sse.isStreaming}
              onClick={handleGenerate}
            >
              <Wand2 className="mr-2 h-4 w-4" />
              기획서 개선하기
            </Button>
          )}
        </div>

        <RecentJobsPanel type="spec-improve" />
      </div>
    </div>
  );
}
