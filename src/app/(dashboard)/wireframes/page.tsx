"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Smartphone,
  Monitor,
  Sparkles,
  Shuffle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropzone } from "@/components/upload/dropzone";
import { cn } from "@/lib/utils";
import { useSSE } from "@/hooks/use-sse";
import { GenerationProgress } from "@/components/generation-progress";
import { GenerationError } from "@/components/generation-error";
import { RecentJobsPanel } from "@/components/recent-jobs-panel";

const SCREEN_TYPE_OPTIONS = [
  {
    value: "auto",
    label: "AI 자동 판단",
    description: "AI가 문서를 분석해 화면별 타입 결정",
    icon: Sparkles,
  },
  {
    value: "mobile",
    label: "모바일",
    description: "전체 화면을 모바일(360px)로 생성",
    icon: Smartphone,
  },
  {
    value: "desktop",
    label: "데스크톱",
    description: "전체 화면을 데스크톱(800px)로 생성",
    icon: Monitor,
  },
  {
    value: "mixed",
    label: "혼합",
    description: "모바일과 데스크톱을 AI가 혼합 배치",
    icon: Shuffle,
  },
] as const;

export default function WireframesPage() {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [screenTypeMode, setScreenTypeMode] = useState<string>("auto");

  const sse = useSSE("/api/wireframes");

  // 완료 시 결과 페이지로 리다이렉트
  useEffect(() => {
    if (sse.result && sse.jobId) {
      router.push(`/wireframes/${sse.jobId}`);
    }
  }, [sse.result, sse.jobId, router]);

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
  };

  const handleGenerate = () => {
    if (!file || !projectName.trim()) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectName", projectName);
    formData.append("screenTypeMode", screenTypeMode);

    sse.start(formData);
  };

  // 스트리밍 중이면 진행상태 표시
  if (sse.isStreaming) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">와이어프레임 생성</h2>
          <p className="text-muted-foreground">
            {projectName} — AI가 와이어프레임을 생성하고 있습니다.
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
          <h2 className="text-2xl font-bold tracking-tight">와이어프레임 생성</h2>
        </div>
        <GenerationError error={sse.error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">와이어프레임 생성</h2>
        <p className="text-muted-foreground">
          기획 문서를 업로드하면 AI가 화면 구성과 흐름을 설계하여 Figma에서
          와이어프레임으로 생성합니다.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">3. 화면 타입</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {SCREEN_TYPE_OPTIONS.map((opt) => {
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
                      <opt.icon
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
            disabled={!file || !projectName.trim() || sse.isStreaming}
            onClick={handleGenerate}
          >
            <Smartphone className="mr-2 h-4 w-4" />
            와이어프레임 생성하기
          </Button>
        </div>

        <RecentJobsPanel type="wireframes" />
      </div>
    </div>
  );
}
