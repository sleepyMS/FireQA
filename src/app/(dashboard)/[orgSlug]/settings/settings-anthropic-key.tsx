"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { KeyRound, Trash2, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface AnthropicKeyData {
  hasKey: boolean;
  keyPrefix: string | null;
}

export default function SettingsAnthropicKey() {
  const [data, setData] = useState<AnthropicKeyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    fetch("/api/settings/anthropic-key")
      .then((r) => r.json())
      .then(setData)
      .catch(() => toast.error("Anthropic 키 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!apiKey.trim()) {
      toast.error("API 키를 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/anthropic-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error || "저장에 실패했습니다.");
        return;
      }
      setData({ hasKey: true, keyPrefix: body.keyPrefix });
      setApiKey("");
      setShowKey(false);
      toast.success("Anthropic API 키가 저장되었습니다.");
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Anthropic API 키를 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/settings/anthropic-key", {
        method: "DELETE",
      });
      if (res.ok || res.status === 204) {
        setData({ hasKey: false, keyPrefix: null });
        toast.success("Anthropic API 키가 삭제되었습니다.");
      } else {
        toast.error("삭제에 실패했습니다.");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setDeleting(false);
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" />
            Anthropic API 키
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            자체 Anthropic API 키를 등록하면 호스티드 에이전트 사용 시 크레딧이 차감되지 않습니다.
            키는 암호화되어 안전하게 저장됩니다.
          </p>

          {data?.hasKey ? (
            /* 키가 이미 등록된 상태 */
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <KeyRound className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">등록된 키</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {data.keyPrefix}...
                    </Badge>
                    <Badge variant="default" className="text-xs">
                      활성
                    </Badge>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                {deleting ? "삭제 중..." : "삭제"}
              </Button>
            </div>
          ) : (
            /* 키가 없는 상태: 입력 폼 */
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Anthropic API 키</Label>
                <div className="relative">
                  <Input
                    type={showKey ? "text" : "password"}
                    placeholder="sk-ant-api03-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Anthropic Console에서 발급한 API 키를 입력하세요.
                </p>
              </div>
              <Button onClick={handleSave} disabled={saving || !apiKey.trim()}>
                {saving ? "저장 중..." : "저장"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
