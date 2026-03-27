"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  GitBranch,
  Smartphone,
  FileEdit,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { STATUS_CONFIG, JOB_TYPE_LABEL, JOB_TYPE_PATH } from "@/types/enums";

interface Job {
  id: string;
  type: string;
  status: string;
  tokenUsage: number | null;
  createdAt: string;
  project: { id: string; name: string };
  upload: { fileName: string };
}

export default function HistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "";

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit dialog state
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editName, setEditName] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete dialog state
  const [deletingJob, setDeletingJob] = useState<Job | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadJobs = async () => {
    setLoading(true);
    const params = new URLSearchParams({ all: "1" });
    if (type) params.set("type", type);
    const res = await fetch(`/api/jobs?${params}`);
    const data = await res.json();
    setJobs(data.jobs || []);
    setLoading(false);
  };

  useEffect(() => {
    loadJobs();
  }, [type]);

  const handleNavigate = (job: Job) => {
    const basePath = JOB_TYPE_PATH[job.type] || "/generate";
    router.push(`${basePath}/${job.id}`);
  };

  const openEdit = (job: Job) => {
    setEditingJob(job);
    setEditName(job.project.name);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingJob || !editName.trim()) return;
    setSaving(true);
    await fetch("/api/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingJob.id, projectName: editName.trim() }),
    });
    setSaving(false);
    setEditOpen(false);
    setEditingJob(null);
    loadJobs();
  };

  const openDelete = (job: Job) => {
    setDeletingJob(job);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingJob) return;
    setDeleting(true);
    await fetch("/api/jobs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deletingJob.id }),
    });
    setDeleting(false);
    setDeleteOpen(false);
    setDeletingJob(null);
    loadJobs();
  };

  const filterLinks: { label: string; value: string; icon?: React.ReactNode }[] = [
    { label: "전체", value: "" },
    {
      label: "TC 생성",
      value: "test-cases",
      icon: <FileText className="mr-1 h-3 w-3" />,
    },
    {
      label: "다이어그램",
      value: "diagrams",
      icon: <GitBranch className="mr-1 h-3 w-3" />,
    },
    {
      label: "와이어프레임",
      value: "wireframes",
      icon: <Smartphone className="mr-1 h-3 w-3" />,
    },
    {
      label: "기획서 개선",
      value: "spec-improve",
      icon: <FileEdit className="mr-1 h-3 w-3" />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">생성 이력</h2>
        <p className="text-muted-foreground">
          모든 TC 생성, 다이어그램, 와이어프레임, 기획서 개선 이력을 확인합니다.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {filterLinks.map((f) => (
          <Badge
            key={f.value}
            variant={type === f.value ? "default" : "outline"}
            className="cursor-pointer px-3 py-1"
            onClick={() =>
              router.push(f.value ? `/history?type=${f.value}` : "/history")
            }
          >
            {f.icon}
            {f.label}
          </Badge>
        ))}
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-20 text-muted-foreground">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p>이력을 불러오는 중...</p>
            </div>
          </CardContent>
        </Card>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-20 text-center text-muted-foreground">
            <Search className="mb-4 h-12 w-12 opacity-50" />
            <p>
              {type
                ? `${JOB_TYPE_LABEL[type] || type} 이력이 없습니다.`
                : "아직 생성 이력이 없습니다."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card
              key={job.id}
              className="transition-shadow hover:shadow-md"
            >
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <div
                  className="flex flex-1 cursor-pointer items-center gap-3"
                  onClick={() => handleNavigate(job)}
                >
                  {job.type === "test-cases" ? (
                    <FileText className="h-5 w-5 text-blue-600" />
                  ) : job.type === "wireframes" ? (
                    <Smartphone className="h-5 w-5 text-pink-600" />
                  ) : job.type === "spec-improve" ? (
                    <FileEdit className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <GitBranch className="h-5 w-5 text-purple-600" />
                  )}
                  <div>
                    <CardTitle className="text-sm">
                      {job.project.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {job.upload.fileName} &middot;{" "}
                      {JOB_TYPE_LABEL[job.type] || job.type}{" "}
                      &middot;{" "}
                      {new Date(job.createdAt).toLocaleDateString("ko-KR")}
                      {job.tokenUsage
                        ? ` · ${job.tokenUsage.toLocaleString()} 토큰`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_CONFIG[job.status]?.variant ?? "outline"}>
                    {STATUS_CONFIG[job.status]?.label ?? job.status}
                  </Badge>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon-sm" />
                      }
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleNavigate(job)}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        결과 보기
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openEdit(job)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        프로젝트명 수정
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => openDelete(job)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>프로젝트명 수정</DialogTitle>
            <DialogDescription>
              이 이력의 프로젝트명을 변경합니다. 같은 프로젝트의 다른
              이력에도 반영됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>프로젝트명</Label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="프로젝트명을 입력하세요"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleEdit();
              }}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              취소
            </DialogClose>
            <Button
              onClick={handleEdit}
              disabled={!editName.trim() || saving}
            >
              {saving ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>이력 삭제</DialogTitle>
            <DialogDescription>
              &quot;{deletingJob?.project.name}&quot; 이력을 삭제하시겠습니까?
              이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              취소
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
