"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  Loader2,
  Sparkles,
  LayoutTemplate,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dropzone } from "@/components/upload/dropzone";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  description: string | null;
  sheetConfig: string;
  columnConfig: string;
}

export default function GeneratePage() {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<string | null>(null);

  // Template selection
  const [mode, setMode] = useState<"auto" | "template">("auto");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );

  useEffect(() => {
    fetch("/api/templates")
      .then((res) => res.json())
      .then((data) => setTemplates(data.templates || []))
      .catch(() => {});
  }, []);

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

  const handleGenerate = async () => {
    if (!file || !projectName.trim()) return;

    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectName", projectName);
      formData.append("type", "test-cases");
      if (mode === "template" && selectedTemplateId) {
        formData.append("templateId", selectedTemplateId);
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.jobId) {
        router.push(`/generate/${data.jobId}`);
      }
    } catch {
      console.error("생성 실패");
    } finally {
      setIsGenerating(false);
    }
  };

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
              <div className="space-y-2">
                <Label htmlFor="projectName">프로젝트 이름</Label>
                <Input
                  id="projectName"
                  placeholder="예: 공간 제휴 신청"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>
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
                        const sheetList = JSON.parse(
                          tmpl.sheetConfig || "[]"
                        ) as { name: string }[];
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
              !projectName.trim() ||
              isGenerating ||
              (mode === "template" && !selectedTemplateId)
            }
            onClick={handleGenerate}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {mode === "auto"
                  ? "AI 자율로 TC 생성하기"
                  : `"${selectedTemplate?.name || "템플릿"}" 기준으로 TC 생성하기`}
              </>
            )}
          </Button>
        </div>

        {/* Right: Preview */}
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
      </div>
    </div>
  );
}
