"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropzone } from "@/components/upload/dropzone";

export default function DiagramsPage() {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
  };

  const handleGenerate = async () => {
    if (!file || !projectName.trim()) return;

    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectName", projectName);
      formData.append("type", "diagrams");

      const res = await fetch("/api/diagrams", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.jobId) {
        router.push(`/diagrams/${data.jobId}`);
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
        <h2 className="text-2xl font-bold tracking-tight">다이어그램 생성</h2>
        <p className="text-muted-foreground">
          기획 문서를 업로드하면 AI가 사용자 플로우와 상태 다이어그램을 생성하여 FigJam에서 확인할 수 있습니다.
        </p>
      </div>

      <div className="max-w-xl space-y-4">
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
          disabled={!file || !projectName.trim() || isGenerating}
          onClick={handleGenerate}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              생성 중...
            </>
          ) : (
            <>
              <GitBranch className="mr-2 h-4 w-4" />
              다이어그램 생성하기
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
