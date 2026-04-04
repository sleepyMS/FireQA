"use client";

import { useEffect, useState } from "react";
import { Loader2, X, FileSearch, Brain, Save, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Stage } from "@/types/sse";
import { cn } from "@/lib/utils";

export interface GenerationProgressState {
  stage: string;
  message: string;
  progress: number;
  stageIndex: number;
  stageTotal: number;
  chunkInfo: { index: number; total: number } | null;
  charsReceived: number;
}

interface GenerationProgressProps {
  sse: GenerationProgressState;
  onCancel: () => void;
}

const STAGE_META: Record<string, { icon: React.ReactNode; label: string }> = {
  connecting: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    label: "연결",
  },
  [Stage.PARSING]: {
    icon: <FileSearch className="h-4 w-4" />,
    label: "문서 파싱",
  },
  [Stage.PREPARING]: {
    icon: <Sparkles className="h-4 w-4" />,
    label: "준비",
  },
  [Stage.GENERATING]: {
    icon: <Brain className="h-4 w-4" />,
    label: "AI 생성",
  },
  [Stage.SANITIZING]: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    label: "정리",
  },
  [Stage.SAVING]: {
    icon: <Save className="h-4 w-4" />,
    label: "저장",
  },
  [Stage.FIXING]: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    label: "수정",
  },
  [Stage.IMPROVING]: {
    icon: <Brain className="h-4 w-4" />,
    label: "개선",
  },
};

// 각 생성 타입별 기본 단계 시퀀스
const STAGE_SEQUENCES: Record<number, string[]> = {
  4: [Stage.PARSING, Stage.PREPARING, Stage.GENERATING, Stage.SAVING],
  5: [Stage.PARSING, Stage.PREPARING, Stage.GENERATING, Stage.SANITIZING, Stage.SAVING],
};

export function GenerationProgress({
  sse: { stage, message, progress, stageIndex, stageTotal, chunkInfo, charsReceived },
  onCancel,
}: GenerationProgressProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      setElapsed((prev) => {
        const next = Math.floor((Date.now() - start) / 1000);
        return next === prev ? prev : next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = minutes > 0 ? `${minutes}분 ${seconds}초` : `${seconds}초`;

  const stages = STAGE_SEQUENCES[stageTotal] ?? STAGE_SEQUENCES[4]!;
  const hasStepInfo = stageIndex > 0 && stageTotal > 0;

  const currentMeta = STAGE_META[stage] || {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    label: stage,
  };

  return (
    <Card className="border-primary/20">
      <CardContent className="py-8">
        <div className="mx-auto max-w-lg space-y-6">
          {/* Step indicator */}
          {hasStepInfo && (
            <div className="flex items-center justify-center gap-0">
              {stages.map((s, i) => {
                const stepNum = i + 1;
                const meta = STAGE_META[s] || { icon: null, label: s };
                const isCompleted = stepNum < stageIndex;
                const isCurrent = stepNum === stageIndex;

                return (
                  <div key={s} className="flex items-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300",
                          isCompleted && "border-primary bg-primary text-primary-foreground",
                          isCurrent && "border-primary bg-primary/10 text-primary",
                          !isCompleted && !isCurrent && "border-muted-foreground/30 text-muted-foreground/50"
                        )}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : isCurrent ? (
                          <span className="animate-pulse">{meta.icon}</span>
                        ) : (
                          <span className="text-xs font-medium">{stepNum}</span>
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-medium whitespace-nowrap",
                          isCompleted && "text-primary",
                          isCurrent && "text-primary font-semibold",
                          !isCompleted && !isCurrent && "text-muted-foreground/50"
                        )}
                      >
                        {meta.label}
                      </span>
                    </div>
                    {/* Connector line between steps */}
                    {i < stages.length - 1 && (
                      <div
                        className={cn(
                          "mx-1 mb-5 h-0.5 w-8 transition-all duration-300",
                          stepNum < stageIndex ? "bg-primary" : "bg-muted-foreground/20"
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Current status */}
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              {currentMeta.icon}
            </div>
            <p className="text-sm font-medium">{message}</p>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <Progress value={progress} />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span>{timeStr} 경과</span>
                {charsReceived > 0 && (
                  <span>{(charsReceived / 1024).toFixed(1)} KB 수신</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {chunkInfo && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    청크 {chunkInfo.index}/{chunkInfo.total}
                  </Badge>
                )}
                <span className="tabular-nums">{Math.round(progress)}%</span>
              </div>
            </div>
          </div>

          {/* Cancel */}
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground">
              <X className="mr-1 h-3.5 w-3.5" />
              취소
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
