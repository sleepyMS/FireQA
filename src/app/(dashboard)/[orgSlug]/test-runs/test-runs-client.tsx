"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Play, FlaskConical } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabNav } from "@/components/ui/tab-nav";
import { TestRunStatusBadge } from "@/components/test-runs/test-run-status-badge";
import { TestRunProgressBar } from "@/components/test-runs/test-run-progress-bar";
import { SWR_KEYS } from "@/lib/swr/keys";
import { fetcher } from "@/lib/swr/fetcher";
import { useDynamicRefresh } from "@/hooks/use-dynamic-refresh";

type TestCaseCount = {
  total: number;
  pending: number;
  passed: number;
  failed: number;
  skipped: number;
  blocked: number;
};

type TestRunItem = {
  id: string;
  projectId: string;
  projectName: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  createdBy: { id: string; name: string | null; email: string } | null;
  testCaseCount: TestCaseCount;
  passRate: number | null;
};

type ListResponse = {
  testRuns: TestRunItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
};

type CompletedJob = {
  id: string;
  type: string;
  createdAt: string;
  projectName: string;
};

interface Props {
  orgSlug: string;
  initialData: ListResponse;
  completedJobs: CompletedJob[];
}

const statusTabs = [
  { value: "", label: "전체" },
  { value: "in_progress", label: "실행 중" },
  { value: "completed", label: "완료" },
  { value: "aborted", label: "중단" },
];

export function TestRunsClient({ orgSlug, initialData, completedJobs }: Props) {
  const [activeStatus, setActiveStatus] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [creating, setCreating] = useState(false);

  const params = new URLSearchParams({
    page: String(page),
    pageSize: "20",
  });
  if (activeStatus) params.set("status", activeStatus);
  const swrKey = SWR_KEYS.testRuns(params.toString());

  const dynamicRefresh = useDynamicRefresh<ListResponse>({
    activeInterval: 10_000,
    idleInterval: 30_000,
  });

  const { data, mutate } = useSWR<ListResponse>(swrKey, fetcher, {
    fallbackData: page === 1 && !activeStatus ? initialData : undefined,
    refreshInterval: dynamicRefresh.refreshInterval,
    onSuccess: dynamicRefresh.onSuccess,
  });

  const testRuns = data?.testRuns ?? [];
  const pagination = data?.pagination ?? initialData.pagination;

  async function handleCreate() {
    if (!selectedJobId) return;
    setCreating(true);
    try {
      const res = await fetch("/api/test-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationJobId: selectedJobId }),
      });
      if (!res.ok) throw new Error("Failed to create test run");
      setDialogOpen(false);
      setSelectedJobId("");
      mutate();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">테스트 실행</h1>
          <p className="text-sm text-muted-foreground">
            TC 실행 결과를 추적하고 관리합니다.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button>
                <Play className="mr-2 h-4 w-4" />
                실행 시작
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 테스트 실행</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">생성 작업 선택</label>
                <Select value={selectedJobId} onValueChange={(v) => setSelectedJobId(v ?? "")}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="완료된 TC 생성 작업 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {completedJobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.projectName} — {new Date(job.createdAt).toLocaleDateString("ko-KR")}
                      </SelectItem>
                    ))}
                    {completedJobs.length === 0 && (
                      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                        완료된 TC 생성 작업이 없습니다.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={!selectedJobId || creating}
              >
                {creating ? "생성 중..." : "실행 시작"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <TabNav tabs={statusTabs} value={activeStatus} onValueChange={(v) => { setActiveStatus(v); setPage(1); }} />

      {testRuns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FlaskConical className="mb-3 h-10 w-10" />
          <p>테스트 실행이 없습니다.</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>프로젝트</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>진행</TableHead>
                <TableHead className="text-right">통과율</TableHead>
                <TableHead>실행자</TableHead>
                <TableHead>시작</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testRuns.map((run) => (
                <TableRow key={run.id} className="cursor-pointer">
                  <TableCell>
                    <Link
                      href={`/${orgSlug}/test-runs/${run.id}`}
                      className="font-medium hover:underline"
                    >
                      {run.projectName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <TestRunStatusBadge status={run.status} />
                  </TableCell>
                  <TableCell className="min-w-[200px]">
                    <TestRunProgressBar counts={run.testCaseCount} />
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {run.passRate !== null ? `${run.passRate}%` : "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {run.createdBy?.name ?? run.createdBy?.email ?? "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(run.startedAt).toLocaleDateString("ko-KR", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                이전
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                다음
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
