"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModelSelector } from "@/components/model-selector";
import { useModel } from "@/hooks/use-model";
import { useExecutionMode } from "@/hooks/use-execution-mode";
import { ExecutionModeSelector } from "@/components/execution-mode-selector";
import SettingsAgent from "@/app/(dashboard)/[orgSlug]/settings/settings-agent";

export default function AccountAI() {
  const { selectedModel, setSelectedModel } = useModel();
  const { executionMode, setExecutionMode } = useExecutionMode();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">AI 실행 방식</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          생성 기능에서 사용할 AI 실행 방식을 선택합니다.
        </p>

        <ExecutionModeSelector
          value={executionMode}
          onChange={setExecutionMode}
          showWarning={false}
        />

        <div className={executionMode === "server" ? "" : "hidden"}>
          <p className="text-xs text-muted-foreground mb-2">사용할 모델을 선택하세요.</p>
          <ModelSelector value={selectedModel} onChange={setSelectedModel} />
        </div>

        <div className={executionMode === "agent" ? "" : "hidden"}>
          <SettingsAgent />
        </div>
      </CardContent>
    </Card>
  );
}
