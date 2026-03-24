"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropzone } from "@/components/upload/dropzone";
import { useSSE } from "@/hooks/use-sse";
import { GenerationProgress } from "@/components/generation-progress";
import { GenerationError } from "@/components/generation-error";
import { RecentJobsPanel } from "@/components/recent-jobs-panel";

export default function DiagramsPage() {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const sse = useSSE("/api/diagrams");

  // 완료 시 결과 페이지로 리다이렉트
  useEffect(() => {
    if (sse.result && sse.jobId) {
      router.push(`/diagrams/${sse.jobId}`);
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
    formData.append("type", "diagrams");

    sse.start(formData);
  };

  // 스트리밍 중이면 진행상태 표시
  if (sse.isStreaming) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">다이어그램 생성</h2>
          <p className="text-muted-foreground">
            {projectName} — AI가 다이어그램을 생성하고 있습니다.
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
          <h2 className="text-2xl font-bold tracking-tight">다이어그램 생성</h2>
        </div>
        <GenerationError error={sse.error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">다이어그램 생성</h2>
        <p className="text-muted-foreground">
          기획 문서를 업로드하면 AI가 사용자 플로우와 상태 다이어그램을 생성하여 FigJam에서 확인할 수 있습니다.
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

          <Button
            className="w-full"
            size="lg"
            disabled={!file || !projectName.trim() || sse.isStreaming}
            onClick={handleGenerate}
          >
            <GitBranch className="mr-2 h-4 w-4" />
            다이어그램 생성하기
          </Button>
        </div>

        <RecentJobsPanel type="diagrams" />
      </div>
    </div>
  );
}
