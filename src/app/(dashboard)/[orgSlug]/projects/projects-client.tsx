"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { FolderOpen, Archive, Trash2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ProjectCard } from "@/components/projects/project-card";
import useSWR from "swr";
import { SWR_KEYS } from "@/lib/swr/keys";
import { useLocale } from "@/lib/i18n/locale-provider";

// SSR 서버 컴포넌트에서 직렬화된 프로젝트 타입
export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  _count: { jobs: number; uploads: number };
}

type StatusFilter = "active" | "archived" | "deleted";

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col gap-3">
      <div className="h-4 w-2/3 rounded bg-muted" />
      <div className="h-3 w-full rounded bg-muted" />
      <div className="h-3 w-4/5 rounded bg-muted" />
      <div className="flex gap-2 mt-2">
        <div className="h-5 w-16 rounded-full bg-muted" />
        <div className="h-5 w-16 rounded-full bg-muted" />
      </div>
    </div>
  );
}

function EmptyState({ status }: { status: StatusFilter }) {
  const { t } = useLocale();
  if (status === "archived") {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
        <Archive className="mb-4 h-12 w-12 opacity-30" />
        <p>{t.projects.emptyArchived}</p>
      </div>
    );
  }
  if (status === "deleted") {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
        <Trash2 className="mb-4 h-12 w-12 opacity-30" />
        <p>{t.projects.emptyDeleted}</p>
      </div>
    );
  }
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
      <FolderOpen className="mb-4 h-12 w-12 opacity-30" />
      <p>{t.projects.emptyActive}</p>
    </div>
  );
}

interface ProjectsClientProps {
  initialProjects: Project[];
  initialNextCursor: string | null;
}

export function ProjectsClient({
  initialProjects,
  initialNextCursor,
}: ProjectsClientProps) {
  const { t } = useLocale();
  const [status, setStatus] = useState<StatusFilter>("active");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

  const STATUS_TABS: { value: StatusFilter; label: string }[] = [
    { value: "active", label: t.projects.tabActive },
    { value: "archived", label: t.projects.tabArchived },
    { value: "deleted", label: t.projects.tabDeleted },
  ];

  // 검색어 디바운스 (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // active 탭 + 검색어 없을 때만 SSR 초기 데이터를 fallback으로 활용
  const isInitialView = status === "active" && !debouncedSearch;
  const params = new URLSearchParams({ status });
  if (debouncedSearch) params.set("search", debouncedSearch);
  const swrKey = SWR_KEYS.projects(params.toString());

  const { data, mutate, isLoading } = useSWR<{
    projects: Project[];
    nextCursor: string | null;
  }>(swrKey, {
    ...(isInitialView
      ? {
          fallbackData: {
            projects: initialProjects,
            nextCursor: initialNextCursor,
          },
        }
      : {}),
  });

  const projects = data?.projects ?? (isInitialView ? initialProjects : []);
  const nextCursor = data?.nextCursor ?? (isInitialView ? initialNextCursor : null);
  const loading = isLoading && !data;

  const [extraProjects, setExtraProjects] = useState<Project[]>([]);
  const [extraNextCursor, setExtraNextCursor] = useState<string | null>(null);

  // status/검색 변경 시 extra 상태 초기화 (렌더 중 동기적으로 처리)
  const prevFilterRef = useRef(`${status}::${debouncedSearch}`);
  const filterKey = `${status}::${debouncedSearch}`;
  if (prevFilterRef.current !== filterKey) {
    prevFilterRef.current = filterKey;
    setExtraProjects([]);
    setExtraNextCursor(null);
  }

  const allProjects = [...projects, ...extraProjects];
  const showNextCursor =
    extraProjects.length === 0 ? nextCursor : extraNextCursor;

  async function loadMore() {
    const cursor = showNextCursor;
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const moreParams = new URLSearchParams({ status });
      if (debouncedSearch) moreParams.set("search", debouncedSearch);
      moreParams.set("cursor", cursor);
      const res = await fetch(`/api/projects?${moreParams}`);
      if (!res.ok) {
        toast.error(t.projects.toastLoadMoreError);
        return;
      }
      const moreData = (await res.json()) as {
        projects: Project[];
        nextCursor: string | null;
      };
      setExtraProjects((prev) => [...prev, ...moreData.projects]);
      setExtraNextCursor(moreData.nextCursor);
    } catch {
      toast.error(t.projects.toastNetworkError);
    } finally {
      setLoadingMore(false);
    }
  }

  function refresh() {
    setExtraProjects([]);
    setExtraNextCursor(null);
    mutate();
  }

  // 새 프로젝트 다이얼로그
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!newName.trim()) {
      toast.error(t.projects.nameRequired);
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || undefined,
        }),
      });
      if (res.ok) {
        toast.success(t.projects.toastCreated);
        setNewProjectOpen(false);
        setNewName("");
        setNewDescription("");
        // active 탭으로 전환 후 새로고침
        setStatus("active");
        refresh();
      } else {
        const errData = await res.json();
        toast.error(errData.error || t.projects.toastCreateError);
      }
    } catch {
      toast.error(t.projects.toastNetworkError);
    } finally {
      setCreating(false);
    }
  }

  async function handleArchive(project: Project) {
    const isArchived = project.status === "archived";
    try {
      const res = await fetch(`/api/projects/${project.id}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: !isArchived }),
      });
      if (res.ok) {
        toast.success(
          isArchived ? t.projects.toastUnarchived : t.projects.toastArchived
        );
        refresh();
      } else {
        const errData = await res.json();
        toast.error(errData.error || t.projects.toastArchiveError);
      }
    } catch {
      toast.error(t.projects.toastNetworkError);
    }
  }

  async function handleDelete(project: Project) {
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(t.projects.toastDeleted);
        refresh();
      } else {
        const errData = await res.json();
        toast.error(errData.error || t.projects.toastDeleteError);
      }
    } catch {
      toast.error(t.projects.toastNetworkError);
    }
  }

  async function handleRestore(project: Project) {
    try {
      const res = await fetch(`/api/projects/${project.id}/restore`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success(t.projects.toastRestored);
        refresh();
      } else {
        const errData = await res.json();
        toast.error(errData.error || t.projects.toastRestoreError);
      }
    } catch {
      toast.error(t.projects.toastNetworkError);
    }
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t.projects.pageTitle}</h2>
          <p className="text-muted-foreground">
            {t.projects.pageDescription}
          </p>
        </div>
        <Button onClick={() => setNewProjectOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          {t.projects.newProject}
        </Button>
      </div>

      {/* 필터 탭 + 검색 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* 상태 탭 */}
        <div className="flex gap-1 rounded-lg border bg-muted/50 p-1 w-fit">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatus(tab.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                status === tab.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 검색 입력 */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t.projects.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 w-full sm:w-60"
          />
        </div>
      </div>

      {/* 프로젝트 그리드 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : allProjects.length === 0 ? (
          <EmptyState status={status} />
        ) : (
          allProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onArchive={() => handleArchive(project)}
              onDelete={() => handleDelete(project)}
              onRestore={() => handleRestore(project)}
            />
          ))
        )}
      </div>

      {/* 더 보기 버튼 */}
      {showNextCursor && !loading && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? t.projects.loadingMore : t.projects.loadMore}
          </Button>
        </div>
      )}

      {/* 새 프로젝트 다이얼로그 */}
      <Dialog
        open={newProjectOpen}
        onOpenChange={(open) => {
          if (!open) {
            setNewProjectOpen(false);
            setNewName("");
            setNewDescription("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.projects.newProjectDialogTitle}</DialogTitle>
            <DialogDescription>
              {t.projects.newProjectDialogDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="project-name">{t.projects.nameLabel}</Label>
              <Input
                id="project-name"
                placeholder={t.projects.namePlaceholder}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) handleCreate();
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-description">{t.projects.descriptionLabel}</Label>
              <Textarea
                id="project-description"
                placeholder={t.projects.descriptionPlaceholderLong}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t.common.cancel}</DialogClose>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? t.projects.creating : t.common.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
