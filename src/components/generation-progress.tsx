"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, X, FileSearch, Brain, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Stage } from "@/types/sse";
import { useLocale } from "@/lib/i18n/locale-provider";

interface GenerationProgressProps {
  stage: string;
  message: string;
  progress: number;
  chunkInfo: { index: number; total: number } | null;
  charsReceived: number;
  onCancel: () => void;
}

export function GenerationProgress({
  stage,
  message,
  progress,
  chunkInfo,
  charsReceived,
  onCancel,
}: GenerationProgressProps) {
  const { t } = useLocale();

  // Must be inside component to access t; memoized so icons are not recreated on every render
  const STAGE_ICONS = useMemo<Record<string, React.ReactNode>>(
    () => ({
      connecting: <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />,
      [Stage.PARSING]: <FileSearch className="h-5 w-5 text-blue-500" />,
      [Stage.GENERATING]: <Brain className="h-5 w-5 text-purple-500 animate-pulse" />,
      [Stage.SANITIZING]: <Loader2 className="h-5 w-5 animate-spin text-orange-500" />,
      [Stage.SAVING]: <Save className="h-5 w-5 text-green-500" />,
      [Stage.FIXING]: <Loader2 className="h-5 w-5 animate-spin text-orange-500" />,
      [Stage.IMPROVING]: <Brain className="h-5 w-5 text-purple-500 animate-pulse" />,
    }),
    [],
  );

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
  const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  const icon = STAGE_ICONS[stage] || <Loader2 className="h-5 w-5 animate-spin text-primary" />;

  return (
    <Card className="border-primary/20">
      <CardContent className="py-8">
        <div className="mx-auto max-w-md space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              {icon}
            </div>
            <p className="text-sm font-medium">{message}</p>
          </div>

          <Progress value={progress} />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>{timeStr} {t.generation.elapsed}</span>
              {charsReceived > 0 && (
                <span>{(charsReceived / 1024).toFixed(1)} {t.generation.kbReceived}</span>
              )}
            </div>
            {chunkInfo && (
              <span>
                {t.generation.chunk} {chunkInfo.index}/{chunkInfo.total}
              </span>
            )}
          </div>

          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground">
              <X className="mr-1 h-3.5 w-3.5" />
              {t.common.cancel}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
