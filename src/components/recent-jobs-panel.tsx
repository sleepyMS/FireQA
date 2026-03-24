"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  GitBranch,
  Smartphone,
  Clock,
  ChevronRight,
  FolderOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_CONFIG, JOB_TYPE_PATH } from "@/types/enums";

interface Job {
  id: string;
  type: string;
  status: string;
  tokenUsage: number | null;
  createdAt: string;
  project: { id: string; name: string };
  upload: { fileName: string };
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; bg: string }> = {
  "test-cases": {
    icon: <FileText className="h-4 w-4 text-blue-600" />,
    bg: "bg-blue-50",
  },
  diagrams: {
    icon: <GitBranch className="h-4 w-4 text-purple-600" />,
    bg: "bg-purple-50",
  },
  wireframes: {
    icon: <Smartphone className="h-4 w-4 text-pink-600" />,
    bg: "bg-pink-50",
  },
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

interface RecentJobsPanelProps {
  type: string;
  title?: string;
  limit?: number;
}

export function RecentJobsPanel({
  type,
  title = "최근 생성 이력",
  limit = 10,
}: RecentJobsPanelProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ all: "1", type });
    fetch(`/api/jobs?${params}`)
      .then((res) => res.json())
      .then((data) => setJobs((data.jobs || []).slice(0, limit)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type, limit]);

  const handleNavigate = (job: Job) => {
    const basePath = JOB_TYPE_PATH[job.type] || "/generate";
    router.push(`${basePath}/${job.id}`);
  };

  const config = TYPE_CONFIG[type] || TYPE_CONFIG["test-cases"];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {title}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => router.push(`/history?type=${type}`)}
          >
            전체 보기
            <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <FolderOpen className="mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm">아직 생성 이력이 없습니다.</p>
            <p className="mt-1 text-xs">위에서 파일을 업로드해 생성해 보세요.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <button
                key={job.id}
                onClick={() => handleNavigate(job)}
                className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${config.bg}`}>
                  {config.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {job.project.name}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="truncate">{job.upload.fileName}</span>
                    <span className="shrink-0">·</span>
                    <span className="shrink-0">{formatRelativeTime(job.createdAt)}</span>
                  </div>
                </div>
                <Badge
                  variant={STATUS_CONFIG[job.status]?.variant ?? "outline"}
                  className="shrink-0"
                >
                  {STATUS_CONFIG[job.status]?.label ?? job.status}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
