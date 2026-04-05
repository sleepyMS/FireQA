"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { GitBranch, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dropzone } from "@/components/upload/dropzone";
import { useSSE } from "@/hooks/use-sse";
import { useAgentGenerate } from "@/hooks/use-agent-generate";
import { useExecutionMode } from "@/hooks/use-execution-mode";
import { useModel } from "@/hooks/use-model";
import { GenerationProgress } from "@/components/generation-progress";
import { GenerationError } from "@/components/generation-error";
import { RecentJobsPanel } from "@/components/recent-jobs-panel";
import { ProjectSelector } from "@/components/projects/project-selector";
import { useLocale } from "@/lib/i18n/locale-provider";

type ProjectSelection =
  | { type: "existing"; id: string; name: string }
  | { type: "new"; name: string };

export default function DiagramsPage() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  const [projectSelection, setProjectSelection] =
    useState<ProjectSelection | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const { executionMode, setExecutionMode } = useExecutionMode();
  const { selectedModel } = useModel();

  const sse = useSSE("/api/diagrams");
  const agentGenerate = useAgentGenerate("/api/diagrams");

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
      router.push(`${orgSlug ? `/${orgSlug}` : ""}/diagrams/${sse.jobId}`);
    }
  }, [sse.result, sse.jobId, router, orgSlug]);

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
  };

  const handleGenerate = async () => {
    if (!file || !projectSelection) return;

    const formData = new FormData();
    formData.append("file", file);
    if (projectSelection.type === "existing") {
      formData.append("projectId", projectSelection.id);
    } else {
      formData.append("projectName", projectSelection.name);
    }
    formData.append("type", "diagrams");
    if (executionMode === "server") {
      formData.append("model", selectedModel);
    }

    if (executionMode === "agent") {
      const res = await agentGenerate.submit(formData);
      if (res?.jobId) {
        router.push(`${orgSlug ? `/${orgSlug}` : ""}/diagrams/${res.jobId}`);
      }
    } else {
      sse.start(formData);
    }
  };

  // 스트리밍 중이면 진행상태 표시
  if (sse.isStreaming) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t.diagrams.pageTitle}</h2>
          <p className="text-muted-foreground">
            {projectSelection?.name} — {t.diagrams.streaming}
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
          <h2 className="text-2xl font-bold tracking-tight">{t.diagrams.pageTitle}</h2>
        </div>
        <GenerationError error={sse.error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t.diagrams.pageTitle}</h2>
        <p className="text-muted-foreground">{t.diagrams.pageDescription}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.diagrams.step1}</CardTitle>
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
              <CardTitle className="text-base">{t.diagrams.step2}</CardTitle>
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

          <Button
            className="w-full"
            size="lg"
            disabled={!file || !projectSelection || sse.isStreaming || agentGenerate.isSubmitting}
            onClick={handleGenerate}
          >
            <GitBranch className="mr-2 h-4 w-4" />
            {agentGenerate.isSubmitting ? "에이전트에 전달 중..." : t.diagrams.generate}
          </Button>
          {agentGenerate.error && (
            <p className="text-sm text-destructive">{agentGenerate.error}</p>
          )}
        </div>

        <RecentJobsPanel type="diagrams" />
      </div>
    </div>
  );
}
