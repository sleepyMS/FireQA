"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Trash2, Plus, Copy, Check } from "lucide-react";
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

const ALL_EVENTS = [
  { value: "generation.completed", label: "생성 완료" },
  { value: "generation.failed", label: "생성 실패" },
  { value: "member.invited", label: "멤버 초대" },
  { value: "project.created", label: "프로젝트 생성" },
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

export default function SettingsWebhooks() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);

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
                  <Button variant="outline" size="sm" onClick={() => handleToggle(ep)}>
                    {ep.isActive ? "비활성화" : "활성화"}
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
            </CardContent>
          </Card>
        ))
      )}

      {/* 추가 폼 */}
      {showForm && (
        <Card>
          <CardContent className="space-y-3">
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
