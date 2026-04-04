"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useSWR from "swr";
import { SWR_KEYS } from "@/lib/swr/keys";
import { STATUS_CONFIG, JOB_TYPE_LABEL, JOB_TYPE_PATH } from "@/types/enums";
import { TabNav } from "@/components/ui/tab-nav";
import { useLocale, interp } from "@/lib/i18n/locale-provider";

export interface Job {
  id: string;
  type: string;
  status: string;
  tokenUsage: number | null;
  createdAt: string;
  project: { id: string; name: string };
  upload: { fileName: string };
}

export function HistoryClient({
  initialJobs,
  initialHasMore,
  type: initialType,
  projectId,
  projectName,
}: {
  initialJobs: Job[];
  initialHasMore: boolean;
  type: string;
  projectId?: string;
  projectName?: string;
}) {
  const router = useRouter();
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  const { t } = useLocale();

  const filterLinks = useMemo(
    () => [
      { label: t.history.filterAll, value: "" },
      { label: t.history.filterTc, value: "test-cases", icon: <FileText className="mr-1 h-3 w-3" /> },
      { label: t.history.filterDiagrams, value: "diagrams", icon: <GitBranch className="mr-1 h-3 w-3" /> },
      { label: t.history.filterWireframes, value: "wireframes", icon: <Smartphone className="mr-1 h-3 w-3" /> },
      { label: t.history.filterSpecImprove, value: "spec-improve", icon: <FileEdit className="mr-1 h-3 w-3" /> },
    ],
    [t],
  );

  // 필터를 client state로 관리 — 변경 시 router.push 대신 SWR 재조회
  const [activeType, setActiveType] = useState(initialType);

  const params = new URLSearchParams({ all: "1" });
  if (activeType) params.set("type", activeType);
  if (projectId) params.set("projectId", projectId);
  const swrKey = SWR_KEYS.jobs(params.toString());

  const { data, mutate } = useSWR<{ jobs: Job[]; hasMore: boolean }>(swrKey, {
    fallbackData: activeType === initialType ? { jobs: initialJobs, hasMore: initialHasMore } : undefined,
  });

  const [extraJobs, setExtraJobs] = useState<Job[]>([]);
  const [hasMoreExtra, setHasMoreExtra] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // 필터 변경 시 추가 페이지 초기화
  const prevTypeRef = useRef(activeType);
  useEffect(() => {
    if (prevTypeRef.current !== activeType) {
      setExtraJobs([]);
      setHasMoreExtra(false);
      prevTypeRef.current = activeType;
    }
  }, [activeType]);

  const jobs = [...(data?.jobs ?? initialJobs), ...extraJobs];
  const showLoadMore = extraJobs.length === 0 ? (data?.hasMore ?? initialHasMore) : hasMoreExtra;

  async function loadMore() {
    const cursor = jobs[jobs.length - 1]?.id;
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const moreParams = new URLSearchParams({ all: "1" });
      if (activeType) moreParams.set("type", activeType);
      if (projectId) moreParams.set("projectId", projectId);
      moreParams.set("cursor", cursor);
      const res = await fetch(`/api/jobs?${moreParams}`);
      const moreData = await res.json() as { jobs: Job[]; hasMore: boolean };
      setExtraJobs((prev) => [...prev, ...moreData.jobs]);
      setHasMoreExtra(moreData.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }

  function refresh() {
    setExtraJobs([]);
    setHasMoreExtra(false);
    mutate();
  }

  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editName, setEditName] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [deletingJob, setDeletingJob] = useState<Job | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleNavigate = (job: Job) => {
    router.push(`${orgSlug ? `/${orgSlug}` : ""}${JOB_TYPE_PATH[job.type] || "/generate"}/${job.id}?projectId=${job.project.id}`);
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
    refresh();
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
    refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {projectName
            ? interp(t.history.titleWithProject, { name: projectName })
            : t.history.title}
        </h2>
        <p className="text-muted-foreground">
          {projectId
            ? interp(t.history.descriptionProject, { name: projectName ?? t.history.title })
            : t.history.descriptionAll}
        </p>
      </div>

      <TabNav
        tabs={filterLinks.map((f) => ({ value: f.value, label: <>{f.icon}{f.label}</> }))}
        value={activeType}
        onValueChange={setActiveType}
      />

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-20 text-center text-muted-foreground">
            <Search className="mb-4 h-12 w-12 opacity-50" />
            <p>
              {activeType
                ? interp(t.history.emptyFiltered, { type: JOB_TYPE_LABEL[activeType] || activeType })
                : t.history.emptyAll}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card key={job.id} className="transition-shadow hover:shadow-md">
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
                    <CardTitle className="text-sm">{job.project.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {job.upload.fileName} &middot; {JOB_TYPE_LABEL[job.type] || job.type} &middot;{" "}
                      {new Date(job.createdAt).toLocaleDateString("ko-KR")}
                      {job.tokenUsage ? ` · ${interp(t.history.tokens, { count: job.tokenUsage.toLocaleString() })}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_CONFIG[job.status]?.variant ?? "outline"}>
                    {STATUS_CONFIG[job.status]?.label ?? job.status}
                  </Badge>

                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleNavigate(job)}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {t.history.viewResult}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(job)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        {t.history.editProjectName}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => openDelete(job)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t.common.delete}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
        {showLoadMore && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? t.history.loadingMore : t.history.loadMore}
            </Button>
          </div>
        )}
        </>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.history.editProjectName}</DialogTitle>
            <DialogDescription>
              {t.history.editProjectNameDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t.history.projectNameLabel}</Label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder={t.history.projectNamePlaceholder}
              onKeyDown={(e) => { if (e.key === "Enter") handleEdit(); }}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t.common.cancel}</DialogClose>
            <Button onClick={handleEdit} disabled={!editName.trim() || saving}>
              {saving ? t.common.saving : t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.history.deleteTitle}</DialogTitle>
            <DialogDescription>
              {interp(t.history.deleteDescription, { name: deletingJob?.project.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t.common.cancel}</DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? t.history.deleting : t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
