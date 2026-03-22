"use client";

import { useState } from "react";
import {
  Smartphone,
  Monitor,
  MessageSquare,
  Bell,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Screen {
  id: string;
  title: string;
  description: string;
  screenType?: string;
  step?: number;
  elements: { type: string; label: string }[];
}

interface Flow {
  from: string;
  to: string;
  label: string;
  action: string;
}

interface WireframeResultsProps {
  jobId: string;
  screens: Screen[];
  flows: Flow[];
}

const SCREEN_TYPE_OPTIONS = ["mobile", "desktop", "modal", "toast"] as const;

const SCREEN_TYPE_ICONS: Record<string, React.ElementType> = {
  mobile: Smartphone,
  desktop: Monitor,
  modal: MessageSquare,
  toast: Bell,
};

const SCREEN_TYPE_COLORS: Record<string, string> = {
  mobile: "bg-blue-100 text-blue-700",
  desktop: "bg-purple-100 text-purple-700",
  modal: "bg-amber-100 text-amber-700",
  toast: "bg-green-100 text-green-700",
};

export function WireframeResults({
  jobId,
  screens: initialScreens,
  flows,
}: WireframeResultsProps) {
  const [screens, setScreens] = useState<Screen[]>(initialScreens);

  const handleTypeChange = async (screenId: string, newType: string) => {
    // 즉시 UI 반영
    setScreens((prev) =>
      prev.map((s) =>
        s.id === screenId ? { ...s, screenType: newType } : s
      )
    );

    // DB 저장
    await fetch("/api/wireframes/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId,
        screenId,
        screenType: newType,
      }),
    });
  };

  return (
    <div className="space-y-6">
      {/* 요약 */}
      <div className="flex items-center gap-4">
        <Badge variant="secondary" className="text-sm">
          {screens.length}개 화면
        </Badge>
        <Badge variant="secondary" className="text-sm">
          {flows.length}개 흐름
        </Badge>
        <div className="rounded-md bg-blue-50 px-3 py-1.5 text-xs text-blue-700">
          Figma 플러그인에서 &quot;Figma에 와이어프레임 생성하기&quot;로
          가져가세요
        </div>
      </div>

      {/* 화면 목록 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {screens.map((screen) => {
          const Icon =
            SCREEN_TYPE_ICONS[screen.screenType || "desktop"] || Monitor;
          const colorClass =
            SCREEN_TYPE_COLORS[screen.screenType || "desktop"] || "";

          return (
            <Card key={screen.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Icon className="h-4 w-4 text-purple-500" />
                    {screen.step && (
                      <span className="text-xs text-muted-foreground">
                        Step {screen.step}
                      </span>
                    )}
                    {screen.title}
                  </CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">
                  {screen.description}
                </p>
                {/* screenType 선택 */}
                <div className="flex gap-1 pt-1">
                  {SCREEN_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleTypeChange(screen.id, opt)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-all ${
                        screen.screenType === opt
                          ? colorClass || "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {screen.elements.map((el, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs"
                    >
                      <Badge
                        variant="outline"
                        className="shrink-0 text-[9px]"
                      >
                        {el.type}
                      </Badge>
                      <span className="truncate text-muted-foreground">
                        {el.label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 흐름 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">화면 흐름</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {flows.map((flow, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Badge variant="secondary">{flow.from}</Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <Badge variant="secondary">{flow.to}</Badge>
                <span className="text-xs text-muted-foreground">
                  {flow.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
