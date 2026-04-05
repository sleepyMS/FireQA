"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Bot, Trash2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AgentConnectionView } from "@/types/agent";

export default function SettingsAgent() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [connections, setConnections] = useState<AgentConnectionView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agent/connections")
      .then((r) => r.json())
      .then((data) => setConnections(data.connections ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDisconnect = async (id: string) => {
    if (!confirm("이 에이전트 연결을 해제하시겠습니까?")) return;
    await fetch(`/api/agent/connections/${id}`, { method: "DELETE" });
    setConnections((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4" />
            연결된 에이전트
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">로딩 중...</p>
          ) : connections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              연결된 에이전트가 없습니다.
            </p>
          ) : (
            <div className="divide-y">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{conn.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {conn.metadata?.os ?? ""} · {conn.metadata?.cli ?? ""} · v{conn.metadata?.version ?? "?"}
                    </p>
                  </div>
                  <Badge variant={conn.status === "online" ? "default" : "secondary"}>
                    {conn.status === "online" ? "온라인" : "오프라인"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDisconnect(conn.id)}
                    title="연결 해제"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">에이전트 설정 가이드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            fireqa-agent CLI를 사용하면 로컬 머신에서 Claude Code를 실행하여
            FireQA 작업을 자동으로 처리할 수 있습니다.
          </p>
          <div className="rounded-lg border bg-zinc-950 p-3 text-xs text-zinc-100 font-mono space-y-1">
            <p className="text-zinc-500"># 에이전트 로그인</p>
            <p className="text-green-400">npx fireqa-agent login</p>
            <p className="mt-2 text-zinc-500"># 에이전트 시작</p>
            <p className="text-green-400">npx fireqa-agent start</p>
          </div>
          <Link
            href={`/${orgSlug}/agent/guide`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            자세한 설치 가이드 보기
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
