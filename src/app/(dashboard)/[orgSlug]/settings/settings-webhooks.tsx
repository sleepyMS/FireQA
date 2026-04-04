"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Trash2, Plus, Copy, Check, ChevronDown, ChevronUp, Send, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Endpoint {
  id: string;
  url: string;
  description: string | null;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

interface Delivery {
  id: string;
  event: string;
  responseStatus: number | null;
  success: boolean;
  attempts: number;
  createdAt: string;
}

const ALL_EVENTS = [
  { value: "generation.completed", label: "생성 완료" },
  { value: "generation.failed", label: "생성 실패" },
  { value: "member.invited", label: "멤버 초대" },
  { value: "member.role_changed", label: "역할 변경" },
  { value: "member.removed", label: "멤버 제거" },
  { value: "project.created", label: "프로젝트 생성" },
  { value: "project.updated", label: "프로젝트 수정" },
  { value: "project.archived", label: "프로젝트 보관" },
  { value: "project.unarchived", label: "프로젝트 보관 해제" },
  { value: "project.deleted", label: "프로젝트 삭제" },
  { value: "project.restored", label: "프로젝트 복구" },
  { value: "version.created", label: "버전 생성" },
  { value: "version.activated", label: "버전 활성화" },
  { value: "agent.task_completed", label: "에이전트 작업 완료" },
  { value: "agent.task_failed", label: "에이전트 작업 실패" },
  { value: "test_run.started", label: "테스트 실행 시작" },
  { value: "test_run.completed", label: "테스트 실행 완료" },
  { value: "test_run.aborted", label: "테스트 실행 중단" },
];

function SecretBox({ secret }: { secret: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
      <p className="mb-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
        시크릿 키 — 지금만 확인 가능합니다
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-amber-100 px-2 py-1 text-xs font-mono dark:bg-amber-900">
          {secret}
        </code>
        <button onClick={copy} className="shrink-0 rounded p-1 hover:bg-amber-100 dark:hover:bg-amber-900">
          {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-amber-700" />}
        </button>
      </div>
    </div>
  );
}

function DeliveryHistory({ endpointId }: { endpointId: string }) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/webhook-endpoints/${endpointId}/deliveries`)
      .then((r) => r.json())
      .then((d) => setDeliveries(d.deliveries ?? []))
      .catch(() => toast.error("전달 이력을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [endpointId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <p className="py-3 text-center text-xs text-muted-foreground">
        전달 이력이 없습니다
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-1">
      <p className="text-xs font-medium text-muted-foreground">최근 전달 이력</p>
      <div className="max-h-48 overflow-y-auto rounded-md border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-2 py-1.5 text-left font-medium">이벤트</th>
              <th className="px-2 py-1.5 text-left font-medium">상태</th>
              <th className="px-2 py-1.5 text-left font-medium">시도</th>
              <th className="px-2 py-1.5 text-left font-medium">시간</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((d) => (
              <tr key={d.id} className="border-b last:border-0">
                <td className="px-2 py-1.5 font-mono">{d.event}</td>
                <td className="px-2 py-1.5">
                  <Badge
                    variant={d.success ? "default" : "destructive"}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {d.success ? "성공" : "실패"}
                    {d.responseStatus ? ` (${d.responseStatus})` : ""}
                  </Badge>
                </td>
                <td className="px-2 py-1.5">{d.attempts}</td>
                <td className="px-2 py-1.5 text-muted-foreground">
                  {new Date(d.createdAt).toLocaleString("ko-KR", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SettingsWebhooks() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/webhook-endpoints")
      .then((r) => r.json())
      .then((d) => setEndpoints(d.endpoints ?? []))
      .catch(() => toast.error("웹훅 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  function toggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  async function handleCreate() {
    if (!url.startsWith("https://")) {
      toast.error("URL은 https://로 시작해야 합니다.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/webhook-endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, description, events: selectedEvents }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "생성에 실패했습니다.");
        return;
      }
      setEndpoints((prev) => [{ ...data, createdAt: data.createdAt }, ...prev]);
      setNewSecret(data.secret);
      setUrl("");
      setDescription("");
      setSelectedEvents([]);
      setShowForm(false);
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(ep: Endpoint) {
    const res = await fetch(`/api/webhook-endpoints/${ep.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !ep.isActive }),
    });
    if (res.ok) {
      setEndpoints((prev) => prev.map((e) => (e.id === ep.id ? { ...e, isActive: !e.isActive } : e)));
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/webhook-endpoints/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEndpoints((prev) => prev.filter((e) => e.id !== id));
      toast.success("삭제되었습니다.");
    }
  }

  async function handleTest(ep: Endpoint) {
    setTestingId(ep.id);
    try {
      const res = await fetch(`/api/webhook-endpoints/${ep.id}/test`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`테스트 전송 성공 (${data.statusCode})`);
      } else {
        toast.error(`테스트 전송 실패: ${data.error || "알 수 없는 오류"}`);
      }
      // 이력 패널이 열려있으면 새로고침하기 위해 닫았다 다시 열기
      if (expandedId === ep.id) {
        setExpandedId(null);
        setTimeout(() => setExpandedId(ep.id), 50);
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setTestingId(null);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {newSecret && <SecretBox secret={newSecret} />}

      {/* 엔드포인트 목록 */}
      {endpoints.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            등록된 웹훅이 없습니다
          </CardContent>
        </Card>
      ) : (
        endpoints.map((ep) => (
          <Card key={ep.id}>
            <CardContent className="py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{ep.url}</p>
                  {ep.description && (
                    <p className="text-xs text-muted-foreground">{ep.description}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {ep.events.length === 0 ? (
                      <Badge variant="secondary" className="text-xs">전체 이벤트</Badge>
                    ) : (
                      ep.events.map((ev) => (
                        <Badge key={ev} variant="outline" className="text-xs">
                          {ALL_EVENTS.find((e) => e.value === ev)?.label ?? ev}
                        </Badge>
                      ))
                    )}
                    <Badge variant={ep.isActive ? "default" : "secondary"} className="text-xs">
                      {ep.isActive ? "활성" : "비활성"}
                    </Badge>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(ep)}
                    disabled={testingId === ep.id}
                  >
                    {testingId === ep.id ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="mr-1 h-3.5 w-3.5" />
                    )}
                    테스트
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleToggle(ep)}>
                    {ep.isActive ? "비활성화" : "활성화"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedId(expandedId === ep.id ? null : ep.id)}
                  >
                    {expandedId === ep.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(ep.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {expandedId === ep.id && <DeliveryHistory endpointId={ep.id} />}
            </CardContent>
          </Card>
        ))
      )}

      {/* 추가 폼 */}
      {showForm && (
        <Card>
          <CardContent className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>URL</Label>
              <Input
                placeholder="https://example.com/webhook"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>설명 (선택)</Label>
              <Input
                placeholder="Slack 알림 등"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>이벤트 (미선택 시 전체)</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_EVENTS.map((ev) => (
                  <button
                    key={ev.value}
                    type="button"
                    onClick={() => toggleEvent(ev.value)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      selectedEvents.includes(ev.value)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input hover:bg-accent"
                    }`}
                  >
                    {ev.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
                취소
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={saving}>
                {saving ? "생성 중..." : "생성"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <Button variant="outline" onClick={() => { setNewSecret(null); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          웹훅 추가
        </Button>
      )}
    </div>
  );
}
