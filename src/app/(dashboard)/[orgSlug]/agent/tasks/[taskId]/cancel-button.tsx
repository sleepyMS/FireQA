"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Props {
  taskId: string;
  orgSlug: string;
}

export function CancelButton({ taskId, orgSlug }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCancel = async () => {
    if (!confirm("이 작업을 취소하시겠습니까?")) return;
    setLoading(true);
    try {
      await fetch(`/api/agent/tasks/${taskId}`, { method: "DELETE" });
      router.push(`/${orgSlug}/agent`);
      router.refresh();
    } catch {
      // 오류 시 로딩 상태만 해제
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={handleCancel}
    >
      {loading ? "취소 중..." : "작업 취소"}
    </Button>
  );
}
