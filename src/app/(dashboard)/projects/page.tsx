"use client";

import { useState, useEffect, useCallback } from "react";
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

interface Project {
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

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "active", label: "활성" },
  { value: "archived", label: "보관됨" },
  { value: "deleted", label: "휴지통" },
];

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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState<StatusFilter>("active");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // 새 프로젝트 다이얼로그
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // 검색어 디바운스 (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchProjects = useCallback(
    async (cursor?: string) => {
      const isLoadMore = !!cursor;
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams({ status });
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (cursor) params.set("cursor", cursor);

        const res = await fetch(`/api/projects?${params}`);
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "프로젝트 목록을 불러오지 못했습니다.");
          return;
        }
        const data = await res.json();

        if (isLoadMore) {
          setProjects((prev) => [...prev, ...(data.projects ?? [])]);
        } else {
          setProjects(data.projects ?? []);
        }
        setNextCursor(data.nextCursor ?? null);
      } catch {
        toast.error("네트워크 오류가 발생했습니다.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [status, debouncedSearch]
  );

  // 상태 또는 검색어 변경 시 목록 새로고침
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  async function handleCreate() {
    if (!newName.trim()) {
      toast.error("프로젝트 이름을 입력해주세요.");
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
        toast.success("프로젝트가 생성되었습니다.");
        setNewProjectOpen(false);
        setNewName("");
        setNewDescription("");
        // active 탭으로 이동하여 새로고침
        setStatus("active");
        // status가 이미 active이면 fetchProjects가 재호출되지 않으므로 직접 호출
        if (status === "active") fetchProjects();
      } else {
        const data = await res.json();
        toast.error(data.error || "프로젝트 생성에 실패했습니다.");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
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
          isArchived ? "보관이 해제되었습니다." : "프로젝트를 보관했습니다."
        );
        fetchProjects();
      } else {
        const data = await res.json();
        toast.error(data.error || "처리에 실패했습니다.");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    }
  }

  async function handleDelete(project: Project) {
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("프로젝트가 삭제되었습니다.");
        fetchProjects();
      } else {
        const data = await res.json();
        toast.error(data.error || "삭제에 실패했습니다.");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    }
  }

  async function handleRestore(project: Project) {
    try {
      const res = await fetch(`/api/projects/${project.id}/restore`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("프로젝트가 복구되었습니다.");
        fetchProjects();
      } else {
        const data = await res.json();
        toast.error(data.error || "복구에 실패했습니다.");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    }
  }

  function EmptyState() {
    if (status === "archived") {
      return (
        <div className="col-span-full flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
          <Archive className="mb-4 h-12 w-12 opacity-30" />
          <p>보관된 프로젝트가 없습니다.</p>
        </div>
      );
    }
    if (status === "deleted") {
      return (
        <div className="col-span-full flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
          <Trash2 className="mb-4 h-12 w-12 opacity-30" />
          <p>휴지통이 비어있습니다.</p>
        </div>
      );
    }
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
        <FolderOpen className="mb-4 h-12 w-12 opacity-30" />
        <p>프로젝트가 없습니다. 새 프로젝트를 만들어보세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">프로젝트</h2>
          <p className="text-muted-foreground">
            조직의 프로젝트를 관리합니다.
          </p>
        </div>
        <Button onClick={() => setNewProjectOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          새 프로젝트
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
            placeholder="프로젝트 검색..."
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
        ) : projects.length === 0 ? (
          <EmptyState />
        ) : (
          projects.map((project) => (
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
      {nextCursor && !loading && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchProjects(nextCursor)}
            disabled={loadingMore}
          >
            {loadingMore ? "불러오는 중..." : "더 보기"}
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
            <DialogTitle>새 프로젝트</DialogTitle>
            <DialogDescription>
              새 프로젝트의 이름과 설명을 입력하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="project-name">이름 *</Label>
              <Input
                id="project-name"
                placeholder="프로젝트 이름"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) handleCreate();
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-description">설명 (선택)</Label>
              <Textarea
                id="project-description"
                placeholder="프로젝트에 대한 간단한 설명"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "생성 중..." : "생성"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
