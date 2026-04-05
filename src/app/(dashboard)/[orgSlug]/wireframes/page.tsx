"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import {
  Smartphone,
  Monitor,
  Sparkles,
  Shuffle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dropzone } from "@/components/upload/dropzone";
import { cn } from "@/lib/utils";
import { useSSE } from "@/hooks/use-sse";
import { useAgentGenerate } from "@/hooks/use-agent-generate";
import { useExecutionMode } from "@/hooks/use-execution-mode";
import { useModel } from "@/hooks/use-model";
import { GenerationProgress } from "@/components/generation-progress";
import { GenerationError } from "@/components/generation-error";
import { RecentJobsPanel } from "@/components/recent-jobs-panel";
import { ProjectSelector } from "@/components/projects/project-selector";
import { useLocale } from "@/lib/i18n/locale-provider";

const SCREEN_TYPE_VALUES = ["auto", "mobile", "desktop", "mixed"] as const;
type ScreenTypeValue = typeof SCREEN_TYPE_VALUES[number];

const SCREEN_TYPE_ICONS: Record<ScreenTypeValue, React.ComponentType<{ className?: string }>> = {
  auto: Sparkles,
  mobile: Smartphone,
  desktop: Monitor,
  mixed: Shuffle,
};

type ProjectSelection =
  | { type: "existing"; id: string; name: string }
  | { type: "new"; name: string };

export default function WireframesPage() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  const [projectSelection, setProjectSelection] =
    useState<ProjectSelection | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [screenTypeMode, setScreenTypeMode] = useState<ScreenTypeValue>("auto");
  const { executionMode } = useExecutionMode();
  const { selectedModel } = useModel();

  const sse = useSSE("/api/wireframes");
  const agentGenerate = useAgentGenerate("/api/wireframes");

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
      router.push(`${orgSlug ? `/${orgSlug}` : ""}/wireframes/${sse.jobId}`);
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
    formData.append("screenTypeMode", screenTypeMode);
    if (executionMode === "server") {
      formData.append("model", selectedModel);
    }

    if (executionMode === "agent") {
      const res = await agentGenerate.submit(formData);
      if (res?.jobId) {
        router.push(`${orgSlug ? `/${orgSlug}` : ""}/wireframes/${res.jobId}`);
      }
    } else {
      sse.start(formData);
    }
  };

  const screenTypeOptions = useMemo(
    () =>
      SCREEN_TYPE_VALUES.map((value) => ({
        value,
        label: t.wireframes.screenTypes[value],
        description: t.wireframes.screenTypes[`${value}Desc` as `${ScreenTypeValue}Desc`],
        Icon: SCREEN_TYPE_ICONS[value],
      })),
    [t],
  );

  // 스트리밍 중이면 진행상태 표시
  if (sse.isStreaming) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t.wireframes.pageTitle}</h2>
          <p className="text-muted-foreground">
            {projectSelection?.name} — {t.wireframes.streaming}
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
          <h2 className="text-2xl font-bold tracking-tight">{t.wireframes.pageTitle}</h2>
        </div>
        <GenerationError error={sse.error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t.wireframes.pageTitle}</h2>
        <p className="text-muted-foreground">{t.wireframes.pageDescription}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.wireframes.step1}</CardTitle>
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
              <CardTitle className="text-base">{t.wireframes.step2}</CardTitle>
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.wireframes.step3}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {screenTypeOptions.map((opt) => {
                  const isSelected = screenTypeMode === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setScreenTypeMode(opt.value)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border-2 p-3 text-left text-sm transition-all",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-transparent bg-muted/50 hover:bg-muted"
                      )}
                    >
                      <opt.Icon
                        className={cn(
                          "h-5 w-5 shrink-0",
                          isSelected ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      <div>
                        <p className="font-medium">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {opt.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full"
            size="lg"
            disabled={!file || !projectSelection || sse.isStreaming || agentGenerate.isSubmitting}
            onClick={handleGenerate}
          >
            <Smartphone className="mr-2 h-4 w-4" />
            {agentGenerate.isSubmitting ? "에이전트에 전달 중..." : t.wireframes.generate}
          </Button>
          {agentGenerate.error && (
            <p className="text-sm text-destructive">
              {agentGenerate.error}{" "}
              {agentGenerate.isAgentOffline && (
                <a href={`/${orgSlug}/account`} className="underline">에이전트 설정하기</a>
              )}
            </p>
          )}
        </div>

        <RecentJobsPanel type="wireframes" />
      </div>
    </div>
  );
}
