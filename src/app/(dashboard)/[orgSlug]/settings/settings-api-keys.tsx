"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Trash2, Plus, Copy, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

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
        API 키 — 지금만 확인 가능합니다
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

export default function SettingsApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/api-keys")
      .then((r) => r.json())
      .then((d) => setKeys(d.keys ?? []))
      .catch(() => toast.error("API 키 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("키 이름을 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "생성에 실패했습니다.");
        return;
      }
      setKeys((prev) => [{ id: data.id, name: data.name, keyPrefix: data.keyPrefix, lastUsedAt: null, createdAt: data.createdAt }, ...prev]);
      setNewToken(data.token);
      setName("");
      setShowForm(false);
      toast.success("API 키가 발급되었습니다.");
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("이 API 키를 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/settings/api-keys/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success("삭제되었습니다.");
    } else {
      toast.error("삭제에 실패했습니다.");
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
      {newToken && <SecretBox secret={newToken} />}

      {/* API 키 목록 */}
      {keys.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            발급된 API 키가 없습니다
          </CardContent>
        </Card>
      ) : (
        keys.map((key) => (
          <Card key={key.id}>
            <CardContent className="py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{key.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {key.keyPrefix}...
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      마지막 사용:{" "}
                      {key.lastUsedAt
                        ? key.lastUsedAt.slice(0, 10)
                        : "미사용"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      발급일: {key.createdAt.slice(0, 10)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(key.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* 추가 폼 */}
      {showForm && (
        <Card>
          <CardContent className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>키 이름</Label>
              <Input
                placeholder="예: CI/CD 파이프라인"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setName(""); }}>
                취소
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={saving}>
                {saving ? "발급 중..." : "발급"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <Button variant="outline" onClick={() => { setNewToken(null); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          새 API 키 발급
        </Button>
      )}
    </div>
  );
}
