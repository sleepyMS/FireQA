"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FolderOpen, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import useSWR from "swr";
import { SWR_KEYS } from "@/lib/swr/keys";
import { relativeTime } from "@/lib/date/relative-time";

interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  _count: { jobs: number };
}

interface RecentProjectsPanelProps {
  initialProjects?: Project[];
}

export function RecentProjectsPanel({ initialProjects }: RecentProjectsPanelProps) {
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  const { data, isLoading: loading } = useSWR<{ projects: Project[] }>(
    SWR_KEYS.projects("status=active&limit=5"),
    { ...(initialProjects ? { fallbackData: { projects: initialProjects } } : {}) }
  );
  const projects = data?.projects ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            최근 프로젝트
          </CardTitle>
          <Link href={`${orgSlug ? `/${orgSlug}` : ""}/projects`}>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              전체 보기
              <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border p-3">
                <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <FolderOpen className="mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm">아직 프로젝트가 없습니다.</p>
            <p className="mt-1 text-xs">
              <Link href={`${orgSlug ? `/${orgSlug}` : ""}/projects`} className="text-primary underline-offset-2 hover:underline">
                프로젝트 페이지
              </Link>
              에서 새 프로젝트를 만들어 보세요.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`${orgSlug ? `/${orgSlug}` : ""}/projects/${project.id}`}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50">
                  <FolderOpen className="h-4 w-4 text-orange-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{project.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    생성 {project._count.jobs}건 &middot; {relativeTime(project.updatedAt)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
