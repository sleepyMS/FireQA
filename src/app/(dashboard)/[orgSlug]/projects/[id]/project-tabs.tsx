"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import useSWR from "swr";
import { SWR_KEYS } from "@/lib/swr/keys";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  GitBranch,
  Smartphone,
  FileEdit,
  Search,
  Upload,
  Download,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  JOB_TYPE_LABEL,
  JOB_TYPE_PATH,
  STATUS_CONFIG,
  JobType,
} from "@/types/enums";
import { useLocale } from "@/lib/i18n/locale-provider";

// ── 타입 ──────────────────────────────────────────────────────────────────────

interface Job {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  project: { id: string; name: string };
  upload: { fileName: string };
}

interface UploadRecord {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

interface RecentJob {
  id: string;
  type: string;
  status: string;
  createdAt: string;
}

interface JobCountMap {
  [type: string]: number;
}

interface ProjectTabsProps {
  projectId: string;
  projectName: string;
  projectStatus: string;
  tab: string;
  // 개요 탭용 서버사이드 데이터
  jobCounts: JobCountMap;
  recentJobs: RecentJob[];
  uploads: UploadRecord[];
}

// ── 타입 아이콘 헬퍼 ──────────────────────────────────────────────────────────

function JobTypeIcon({ type, className }: { type: string; className?: string }) {
  const cls = className ?? "h-5 w-5";
  if (type === JobType.TEST_CASES)
    return <FileText className={`${cls} text-blue-600`} />;
  if (type === JobType.WIREFRAMES)
    return <Smartphone className={`${cls} text-pink-600`} />;
  if (type === JobType.SPEC_IMPROVE)
    return <FileEdit className={`${cls} text-emerald-600`} />;
  return <GitBranch className={`${cls} text-purple-600`} />;
}

// ── 개요 탭 ───────────────────────────────────────────────────────────────────

function OverviewTab({
  projectId,
  projectStatus,
  jobCounts,
  recentJobs,
}: {
  projectId: string;
  projectStatus: string;
  jobCounts: JobCountMap;
  recentJobs: RecentJob[];
}) {
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  const orgPrefix = orgSlug ? `/${orgSlug}` : "";
  const { t } = useLocale();

  const STAT_TYPES = [
    { type: JobType.TEST_CASES, label: t.projects.statTcGenerate, color: "text-blue-600", bg: "bg-blue-100" },
    { type: JobType.DIAGRAMS, label: t.projects.statDiagrams, color: "text-purple-600", bg: "bg-purple-100" },
    { type: JobType.WIREFRAMES, label: t.projects.statWireframes, color: "text-pink-600", bg: "bg-pink-100" },
    { type: JobType.SPEC_IMPROVE, label: t.projects.statSpecImprove, color: "text-emerald-600", bg: "bg-emerald-100" },
  ];

  const QUICK_ACTIONS = [
    { href: "/generate", label: t.projects.quickActionTcGenerate, color: "text-blue-600", bg: "bg-blue-100" },
    { href: "/diagrams", label: t.projects.quickActionDiagrams, color: "text-purple-600", bg: "bg-purple-100" },
    { href: "/wireframes", label: t.projects.quickActionWireframes, color: "text-pink-600", bg: "bg-pink-100" },
    { href: "/improve", label: t.projects.quickActionSpecImprove, color: "text-emerald-600", bg: "bg-emerald-100" },
  ];

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_TYPES.map(({ type, label, color, bg }) => (
          <Card key={type}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${bg}`}>
                <JobTypeIcon type={type} className={`h-5 w-5 ${color}`} />
              </div>
              <p className="text-2xl font-bold">{jobCounts[type] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 최근 생성 이력 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t.projects.recentJobsTitle}</CardTitle>
          <Link href={`${orgPrefix}/projects/${projectId}?tab=jobs`}>
            <Button variant="ghost" size="sm">
              {t.projects.viewAll}
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <Search className="mb-3 h-8 w-8 opacity-40" />
              <p className="text-sm">{t.projects.noRecentJobs}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`${orgPrefix}${JOB_TYPE_PATH[job.type] ?? "/generate"}/${job.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <JobTypeIcon type={job.type} className="h-4 w-4" />
                    <div>
                      <p className="text-sm font-medium">
                        {JOB_TYPE_LABEL[job.type] ?? job.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(job.createdAt).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={STATUS_CONFIG[job.status]?.variant ?? "outline"}
                  >
                    {STATUS_CONFIG[job.status]?.label ?? job.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 빠른 생성 액션 — 삭제된 프로젝트는 표시 안 함 */}
      {projectStatus !== "deleted" && (
        <Card>
          <CardHeader>
            <CardTitle>{t.projects.createSectionTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {QUICK_ACTIONS.map(({ href, label, color, bg }) => (
                <Link key={href} href={`${orgPrefix}${href}?projectId=${projectId}`}>
                  <div
                    className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:shadow-sm transition-shadow`}
                  >
                    <div className={`rounded-md p-1.5 ${bg}`}>
                      <JobTypeIcon type={
                        href === "/generate" ? JobType.TEST_CASES
                        : href === "/diagrams" ? JobType.DIAGRAMS
                        : href === "/wireframes" ? JobType.WIREFRAMES
                        : JobType.SPEC_IMPROVE
                      } className={`h-4 w-4 ${color}`} />
                    </div>
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── 생성 결과 탭 ──────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function JobsTab({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  const orgPrefix = orgSlug ? `/${orgSlug}` : "";
  const [typeFilter, setTypeFilter] = useState("");
  const { t } = useLocale();

  const TYPE_FILTERS = [
    { label: t.projects.filterAll, value: "" },
    { label: t.projects.statTcGenerate, value: JobType.TEST_CASES },
    { label: t.projects.statDiagrams, value: JobType.DIAGRAMS },
    { label: t.projects.statWireframes, value: JobType.WIREFRAMES },
    { label: t.projects.statSpecImprove, value: JobType.SPEC_IMPROVE },
  ];

  // SWR: 같은 필터로 재진입 시 캐시 사용 (API 재호출 없음)
  const params = new URLSearchParams({ projectId, all: "1" });
  if (typeFilter) params.set("type", typeFilter);
  const { data, isLoading: loading } = useSWR<{ jobs: Job[] }>(
    SWR_KEYS.jobs(params.toString()),
    fetcher
  );
  const jobs = data?.jobs ?? [];

  return (
    <div className="space-y-4">
      {/* 타입 필터 */}
      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f) => (
          <Badge
            key={f.value}
            variant={typeFilter === f.value ? "default" : "outline"}
            className="cursor-pointer px-3 py-1"
            onClick={() => setTypeFilter(f.value)}
          >
            {f.label}
          </Badge>
        ))}
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16 text-muted-foreground">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p>{t.projects.loadingJobs}</p>
            </div>
          </CardContent>
        </Card>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center text-muted-foreground">
            <Search className="mb-4 h-10 w-10 opacity-40" />
            <p className="text-sm">
              {typeFilter
                ? t.projects.noJobsFiltered.replace("{type}", JOB_TYPE_LABEL[typeFilter] ?? typeFilter)
                : t.projects.noJobs}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card
              key={job.id}
              className="transition-shadow hover:shadow-md cursor-pointer"
              onClick={() =>
                router.push(
                  `${orgPrefix}${JOB_TYPE_PATH[job.type] ?? "/generate"}/${job.id}`
                )
              }
            >
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <JobTypeIcon type={job.type} />
                  <div>
                    <CardTitle className="text-sm">
                      {JOB_TYPE_LABEL[job.type] ?? job.type}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {job.upload.fileName} &middot;{" "}
                      {new Date(job.createdAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={STATUS_CONFIG[job.status]?.variant ?? "outline"}
                  >
                    {STATUS_CONFIG[job.status]?.label ?? job.status}
                  </Badge>
                  <Link
                    href={`${orgPrefix}${JOB_TYPE_PATH[job.type] ?? "/generate"}/${job.id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="outline" size="sm">
                      {t.projects.viewResult}
                    </Button>
                  </Link>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 업로드 탭 ─────────────────────────────────────────────────────────────────

function UploadsTab({ uploads }: { uploads: UploadRecord[] }) {
  const [preview, setPreview] = useState<{ fileName: string; text: string } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { t } = useLocale();

  async function openPreview(uploadId: string) {
    setLoadingId(uploadId);
    try {
      const res = await fetch(`/api/uploads/${uploadId}`);
      const data = await res.json() as { fileName: string; text: string };
      setPreview(data);
    } finally {
      setLoadingId(null);
    }
  }

  if (uploads.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-16 text-center text-muted-foreground">
          <Upload className="mb-4 h-10 w-10 opacity-40" />
          <p className="text-sm">{t.projects.noUploads}</p>
          <p className="text-xs mt-1">{t.projects.noUploadsHint}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {uploads.map((upload) => (
          <Card
            key={upload.id}
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => openPreview(upload.id)}
          >
            <CardHeader className="flex flex-row items-center gap-3 py-3">
              <div className="rounded-md bg-muted p-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{upload.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {upload.fileType} &middot;{" "}
                  {(upload.fileSize / 1024).toFixed(1)} KB &middot;{" "}
                  {new Date(upload.createdAt).toLocaleDateString("ko-KR")}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title={t.projects.previewTitle}
                  disabled={loadingId === upload.id}
                  onClick={(e) => { e.stopPropagation(); openPreview(upload.id); }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <a
                  href={`/api/uploads/${upload.id}?download=1`}
                  download
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button variant="ghost" size="icon-sm" title={t.projects.downloadTitle}>
                    <Download className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="sm:max-w-[75vw] sm:w-[75vw] h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{preview?.fileName}</DialogTitle>
          </DialogHeader>
          <pre className="flex-1 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-muted p-4 text-xs leading-relaxed">
            {preview?.text}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── 메인 탭 컴포넌트 ──────────────────────────────────────────────────────────

export function ProjectTabs({
  projectId,
  projectName: _projectName, // eslint-disable-line @typescript-eslint/no-unused-vars
  projectStatus,
  tab: initialTab,
  jobCounts,
  recentJobs,
  uploads,
}: ProjectTabsProps) {
  const { t } = useLocale();

  const TABS = [
    { value: "overview", label: t.projects.overviewTabLabel },
    { value: "jobs", label: t.projects.jobsTabLabel },
    { value: "uploads", label: t.projects.uploadsTabLabel },
  ];

  return (
    <Tabs defaultValue={initialTab}>
      <TabsList>
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview">
        <OverviewTab
          projectId={projectId}
          projectStatus={projectStatus}
          jobCounts={jobCounts}
          recentJobs={recentJobs}
        />
      </TabsContent>
      <TabsContent value="jobs">
        <JobsTab projectId={projectId} />
      </TabsContent>
      <TabsContent value="uploads">
        <UploadsTab uploads={uploads} />
      </TabsContent>
    </Tabs>
  );
}
