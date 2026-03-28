"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  Sparkles,
  LayoutTemplate,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dropzone } from "@/components/upload/dropzone";
import { cn } from "@/lib/utils";
import { useSSE } from "@/hooks/use-sse";
import { GenerationProgress } from "@/components/generation-progress";
import { GenerationError } from "@/components/generation-error";
import { RecentJobsPanel } from "@/components/recent-jobs-panel";
import { ProjectSelector } from "@/components/projects/project-selector";

interface Template {
  id: string;
  name: string;
  description: string | null;
  sheetConfig: string;
  columnConfig: string;
  parsedSheets?: { name: string }[];
}

type ProjectSelection =
  | { type: "existing"; id: string; name: string }
  | { type: "new"; name: string };

export default function GeneratePage() {
  const router = useRouter();
  const [projectSelection, setProjectSelection] =
    useState<ProjectSelection | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedPreview, setParsedPreview] = useState<string | null>(null);

  // Template selection
  const [mode, setMode] = useState<"auto" | "template">("auto");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );

  const sse = useSSE("/api/generate");

  useEffect(() => {
    fetch("/api/templates")
      .then((res) => res.json())
      .then((data) =>
        setTemplates(
          (data.templates || []).map((t: Template) => ({
            ...t,
            parsedSheets: JSON.parse(t.sheetConfig || "[]"),
          }))
        )
      )
      .catch(() => {});
  }, []);

  // 완료 시 결과 페이지로 리다이렉트
  useEffect(() => {
    if (sse.result && sse.jobId) {
      router.push(`/generate/${sse.jobId}`);
    }
  }, [sse.result, sse.jobId, router]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

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
    formData.append("type", "test-cases");
    if (mode === "template" && selectedTemplateId) {
      formData.append("templateId", selectedTemplateId);
    }

    sse.start(formData);
  };

  // 스트리밍 중이면 진행상태 표시
  if (sse.isStreaming) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">TC 자동 생성</h2>
          <p className="text-muted-foreground">
            {projectSelection?.name} — AI가 테스트케이스를 생성하고 있습니다.
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
          <h2 className="text-2xl font-bold tracking-tight">TC 자동 생성</h2>
        </div>
        <GenerationError error={sse.error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">TC 자동 생성</h2>
        <p className="text-muted-foreground">
          기획 문서를 업로드하면 AI가 테스트케이스를 자동으로 생성합니다.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Upload & Config */}
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

          {/* Mode Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">3. 생성 모드</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Mode Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode("auto");
                    setSelectedTemplateId(null);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border-2 p-3 text-left text-sm transition-all",
                    mode === "auto"
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-muted/50 hover:bg-muted"
                  )}
                >
                  <Sparkles
                    className={cn(
                      "h-5 w-5 shrink-0",
                      mode === "auto"
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  />
                  <div>
                    <p className="font-medium">AI 자율</p>
                    <p className="text-xs text-muted-foreground">
                      AI가 문서를 분석해 구조 결정
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("template")}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border-2 p-3 text-left text-sm transition-all",
                    mode === "template"
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-muted/50 hover:bg-muted"
                  )}
                >
                  <LayoutTemplate
                    className={cn(
                      "h-5 w-5 shrink-0",
                      mode === "template"
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  />
                  <div>
                    <p className="font-medium">템플릿 사용</p>
                    <p className="text-xs text-muted-foreground">
                      지정한 형식에 맞춰 생성
                    </p>
                  </div>
                </button>
              </div>

              {/* Template Select */}
              {mode === "template" && (
                <div className="space-y-2">
                  {templates.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                      <p>저장된 템플릿이 없습니다.</p>
                      <a
                        href="/templates"
                        className="mt-1 inline-block text-xs text-primary underline"
                      >
                        템플릿 만들러 가기
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {templates.map((tmpl) => {
                        const sheetList = tmpl.parsedSheets || [];
                        const isSelected = selectedTemplateId === tmpl.id;
                        return (
                          <button
                            type="button"
                            key={tmpl.id}
                            onClick={() => setSelectedTemplateId(tmpl.id)}
                            className={cn(
                              "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all",
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "hover:bg-muted/50"
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">
                                {tmpl.name}
                              </p>
                              {tmpl.description && (
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {tmpl.description}
                                </p>
                              )}
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {sheetList.map((s) => (
                                  <Badge
                                    key={s.name}
                                    variant="secondary"
                                    className="text-[10px]"
                                  >
                                    {s.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            className="w-full"
            size="lg"
            disabled={
              !file ||
              !projectSelection ||
              sse.isStreaming ||
              (mode === "template" && !selectedTemplateId)
            }
            onClick={handleGenerate}
          >
            <Upload className="mr-2 h-4 w-4" />
            {mode === "auto"
              ? "AI 자율로 TC 생성하기"
              : `"${selectedTemplate?.name || "템플릿"}" 기준으로 TC 생성하기`}
          </Button>
        </div>

        {/* Right: Preview + Recent Jobs */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">문서 미리보기</CardTitle>
            </CardHeader>
            <CardContent>
              {parsedPreview ? (
                <pre className="max-h-[500px] overflow-auto whitespace-pre-wrap rounded-md bg-muted p-4 text-xs">
                  {parsedPreview}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                  <FileText className="mb-4 h-12 w-12 opacity-50" />
                  <p className="text-sm">
                    기획 문서를 업로드하면 내용이 여기에 표시됩니다.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <RecentJobsPanel type="test-cases" />
        </div>
      </div>
    </div>
  );
}
