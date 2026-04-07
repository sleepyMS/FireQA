"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Loader2 } from "lucide-react";

type TaskStatus = "idle" | "pending" | "running" | "completed" | "failed" | "timed_out";

export default function AccountChatTest() {
  const [prompt, setPrompt] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<TaskStatus>("idle");
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => {
    if (!taskId) return;

    let lastStatus = "";
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/agent/chat?taskId=${taskId}`);
        const data = await res.json() as { status: string; output: string | null; errorMessage?: string };
        if (data.status === lastStatus) return;
        lastStatus = data.status;
        setStatus(data.status as TaskStatus);
        if (data.status === "completed") {
          setOutput(data.output);
          stopPolling();
        } else if (data.status === "failed" || data.status === "timed_out") {
          setError(data.errorMessage ?? "작업이 실패했습니다.");
          stopPolling();
        }
      } catch {
        // transient error — keep polling
      }
    }, 1500);

    return stopPolling;
  }, [taskId]);

  async function handleSend() {
    if (!prompt.trim() || status === "pending" || status === "running") return;
    setOutput(null);
    setError(null);
    setTaskId(null);
    setStatus("pending");

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json() as { taskId?: string; error?: string };
      if (!res.ok || !data.taskId) {
        setError(data.error ?? "작업 생성에 실패했습니다.");
        setStatus("failed");
        return;
      }
      setTaskId(data.taskId);
    } catch {
      setError("네트워크 오류");
      setStatus("failed");
    }
  }

  const isLoading = status === "pending" || status === "running";
  const statusLabel: Record<TaskStatus, string> = {
    idle: "",
    pending: "대기 중...",
    running: "실행 중...",
    completed: "완료",
    failed: "실패",
    timed_out: "시간 초과",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          에이전트 채팅 테스트
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          placeholder="에이전트에게 보낼 메시지를 입력하세요"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
          }}
        />
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={handleSend} disabled={isLoading || !prompt.trim()}>
            {isLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            전송
          </Button>
          {status !== "idle" && (
            <span className="text-xs text-muted-foreground">{statusLabel[status]}</span>
          )}
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {output && (
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/50 p-3 text-sm">
            {output}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
