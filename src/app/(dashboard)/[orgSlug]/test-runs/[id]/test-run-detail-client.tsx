"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TestRunStatusBadge, ExecutionStatusBadge } from "@/components/test-runs/test-run-status-badge";
import { TestRunProgressBar } from "@/components/test-runs/test-run-progress-bar";
import { SWR_KEYS } from "@/lib/swr/keys";
import { fetcher } from "@/lib/swr/fetcher";
import { useDynamicRefresh } from "@/hooks/use-dynamic-refresh";
import Link from "next/link";

type TestCaseCount = {
  total: number;
  pending: number;
  passed: number;
  failed: number;
  skipped: number;
  blocked: number;
};

type Execution = {
  id: string;
  tcId: string;
  tcName: string;
  status: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

type TestRunDetail = {
  id: string;
  generationJobId: string;
  projectId: string;
  projectName: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  createdBy: { id: string; name: string | null; email: string } | null;
  testCaseCount: TestCaseCount;
  passRate: number | null;
  executions: Execution[];
};

interface Props {
  orgSlug: string;
  testRunId: string;
  initialData: TestRunDetail;
}

const EXEC_STATUSES = ["pending", "passed", "failed", "skipped", "blocked"] as const;

export function TestRunDetailClient({ orgSlug, testRunId, initialData }: Props) {
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);

  const dynamicRefresh = useDynamicRefresh<TestRunDetail>({
    activeInterval: 5_000,
    idleInterval: 30_000,
  });

  const { data, mutate } = useSWR<TestRunDetail>(
    SWR_KEYS.testRunDetail(testRunId),
    fetcher,
    {
      fallbackData: initialData,
      refreshInterval: dynamicRefresh.refreshInterval,
      onSuccess: dynamicRefresh.onSuccess,
    },
  );

  const detail = data ?? initialData;
  const isInProgress = detail.status === "in_progress";

  async function handleRunStatusChange(status: "completed" | "aborted") {
    setUpdating(status);
    try {
      const res = await fetch(`/api/test-runs/${testRunId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update test run");
      mutate();
    } finally {
      setUpdating(null);
    }
  }

  async function handleExecStatusChange(execId: string, status: string) {
    const res = await fetch(`/api/test-executions/${execId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Failed to update execution");
    mutate();
  }

  async function handleNoteChange(execId: string, note: string) {
    const res = await fetch(`/api/test-executions/${execId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note || null }),
    });
    if (!res.ok) throw new Error("Failed to update note");
    mutate();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/${orgSlug}/test-runs`}>
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {detail.projectName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {new Date(detail.startedAt).toLocaleString("ko-KR")}
              {detail.createdBy && ` · ${detail.createdBy.name ?? detail.createdBy.email}`}
            </p>
          </div>
        </div>
        {isInProgress && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleRunStatusChange("aborted")}
              disabled={updating !== null}
            >
              <XCircle className="mr-2 h-4 w-4" />
              {updating === "aborted" ? "중단 중..." : "중단"}
            </Button>
            <Button
              onClick={() => handleRunStatusChange("completed")}
              disabled={updating !== null}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {updating === "completed" ? "완료 처리 중..." : "완료"}
            </Button>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="rounded-lg border p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">상태</p>
            <div className="mt-1">
              <TestRunStatusBadge status={detail.status} />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">TC 수</p>
            <p className="mt-1 text-lg font-semibold">{detail.testCaseCount.total}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">통과율</p>
            <p className="mt-1 text-lg font-semibold font-mono">
              {detail.passRate !== null ? `${detail.passRate}%` : "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">생성일</p>
            <p className="mt-1 text-sm">
              {new Date(detail.startedAt).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <TestRunProgressBar counts={detail.testCaseCount} />
        </div>
      </div>

      {/* Executions Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">TC ID</TableHead>
            <TableHead>TC명</TableHead>
            <TableHead className="w-[120px]">상태</TableHead>
            <TableHead>메모</TableHead>
            <TableHead className="w-[140px]">수정일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {detail.executions.map((exec) => (
            <ExecutionRow
              key={exec.id}
              exec={exec}
              isInProgress={isInProgress}
              onStatusChange={handleExecStatusChange}
              onNoteChange={handleNoteChange}
            />
          ))}
        </TableBody>
      </Table>

      {detail.executions.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          실행 항목이 없습니다.
        </p>
      )}
    </div>
  );
}

function ExecutionRow({
  exec,
  isInProgress,
  onStatusChange,
  onNoteChange,
}: {
  exec: Execution;
  isInProgress: boolean;
  onStatusChange: (id: string, status: string) => void;
  onNoteChange: (id: string, note: string) => void;
}) {
  const [note, setNote] = useState(exec.note ?? "");
  const [noteTimer, setNoteTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  function handleNoteInput(value: string) {
    setNote(value);
    if (noteTimer) clearTimeout(noteTimer);
    const timer = setTimeout(() => {
      onNoteChange(exec.id, value);
    }, 800);
    setNoteTimer(timer);
  }

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{exec.tcId}</TableCell>
      <TableCell className="text-sm">{exec.tcName}</TableCell>
      <TableCell>
        {isInProgress ? (
          <Select
            value={exec.status}
            onValueChange={(v) => {
              if (v) onStatusChange(exec.id, v);
            }}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXEC_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  <ExecutionStatusBadge status={s} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <ExecutionStatusBadge status={exec.status} />
        )}
      </TableCell>
      <TableCell>
        {isInProgress ? (
          <input
            type="text"
            value={note}
            onChange={(e) => handleNoteInput(e.target.value)}
            placeholder="메모 입력..."
            className="h-7 w-full rounded-md border bg-transparent px-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
            maxLength={500}
          />
        ) : (
          <span className="text-sm text-muted-foreground">
            {exec.note || "-"}
          </span>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {new Date(exec.updatedAt).toLocaleString("ko-KR", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </TableCell>
    </TableRow>
  );
}
