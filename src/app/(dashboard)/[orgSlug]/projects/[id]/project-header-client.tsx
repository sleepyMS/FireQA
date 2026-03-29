"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { ProjectHeader } from "@/components/projects/project-header";

interface ProjectHeaderClientProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    createdAt: string;
    archivedAt: string | null;
  };
  projectId: string;
}

export function ProjectHeaderClient({
  project: initialProject,
  projectId,
}: ProjectHeaderClientProps) {
  const router = useRouter();
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  const [project, setProject] = useState(initialProject);

  const handleUpdate = async (data: { name?: string; description?: string }) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error ?? "수정에 실패했습니다.");
        return;
      }
      const updated = await res.json();
      setProject((prev) => ({
        ...prev,
        name: updated.name ?? prev.name,
        description: updated.description ?? prev.description,
      }));
      toast.success("프로젝트가 수정되었습니다.");
      router.refresh();
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    }
  };

  const handleArchive = async () => {
    const isArchived = project.status === "archived";
    try {
      const res = await fetch(`/api/projects/${projectId}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: !isArchived }),
      });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error ?? "처리에 실패했습니다.");
        return;
      }
      toast.success(isArchived ? "보관이 해제되었습니다." : "프로젝트를 보관했습니다.");
      router.refresh();
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error ?? "삭제에 실패했습니다.");
        return;
      }
      toast.success("프로젝트가 삭제되었습니다.");
      // 삭제 후 프로젝트 목록으로 이동
      router.push(`${orgSlug ? `/${orgSlug}` : ""}/projects`);
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    }
  };

  return (
    <ProjectHeader
      project={project}
      onUpdate={handleUpdate}
      onArchive={handleArchive}
      onDelete={handleDelete}
    />
  );
}
