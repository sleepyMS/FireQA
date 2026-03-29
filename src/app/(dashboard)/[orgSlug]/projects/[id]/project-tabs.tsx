"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
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

const STAT_TYPES = [
  { type: JobType.TEST_CASES, label: "TC 생성", color: "text-blue-600", bg: "bg-blue-100" },
  { type: JobType.DIAGRAMS, label: "다이어그램", color: "text-purple-600", bg: "bg-purple-100" },
  { type: JobType.WIREFRAMES, label: "와이어프레임", color: "text-pink-600", bg: "bg-pink-100" },
  { type: JobType.SPEC_IMPROVE, label: "기획서 개선", color: "text-emerald-600", bg: "bg-emerald-100" },
];

const QUICK_ACTIONS = [
  { href: "/generate", label: "TC 생성", color: "text-blue-600", bg: "bg-blue-100" },
  { href: "/diagrams", label: "다이어그램 생성", color: "text-purple-600", bg: "bg-purple-100" },
  { href: "/wireframes", label: "와이어프레임 생성", color: "text-pink-600", bg: "bg-pink-100" },
  { href: "/improve", label: "기획서 개선", color: "text-emerald-600", bg: "bg-emerald-100" },
];

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
          <CardTitle>최근 생성 이력</CardTitle>
          <Link href={`${orgPrefix}/projects/${projectId}?tab=jobs`}>
            <Button variant="ghost" size="sm">
              전체 보기
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <Search className="mb-3 h-8 w-8 opacity-40" />
              <p className="text-sm">아직 생성 이력이 없습니다.</p>
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
            <CardTitle>생성하기</CardTitle>
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

const TYPE_FILTERS = [
  { label: "전체", value: "" },
  { label: "TC 생성", value: JobType.TEST_CASES },
  { label: "다이어그램", value: JobType.DIAGRAMS },
  { label: "와이어프레임", value: JobType.WIREFRAMES },
  { label: "기획서 개선", value: JobType.SPEC_IMPROVE },
];

function JobsTab({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  const orgPrefix = orgSlug ? `/${orgSlug}` : "";
  const [jobs, setJobs] = useState<Job[]>([]);
  // loading 초기값을 true로 설정 — effect에서 setLoading(true) 호출 불필요
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    const params = new URLSearchParams({ projectId, all: "1" });
    if (typeFilter) params.set("type", typeFilter);
    fetch(`/api/jobs?${params}`)
      .then((r) => r.json())
      .then((data) => setJobs(data.jobs ?? []))
      .finally(() => setLoading(false));
  }, [projectId, typeFilter]);

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
              <p>이력을 불러오는 중...</p>
            </div>
          </CardContent>
        </Card>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center text-muted-foreground">
            <Search className="mb-4 h-10 w-10 opacity-40" />
            <p className="text-sm">
              {typeFilter
                ? `${JOB_TYPE_LABEL[typeFilter] ?? typeFilter} 이력이 없습니다.`
                : "아직 생성 이력이 없습니다."}
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
                      결과 보기
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
          <p className="text-sm">업로드된 파일이 없습니다.</p>
          <p className="text-xs mt-1">생성 시 업로드한 파일이 여기에 표시됩니다.</p>
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
                  title="미리보기"
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
                  <Button variant="ghost" size="icon-sm" title="텍스트 다운로드">
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

const TABS = [
  { value: "overview", label: "개요" },
  { value: "jobs", label: "생성 결과" },
  { value: "uploads", label: "업로드" },
];

export function ProjectTabs({
  projectId,
  projectName: _projectName, // eslint-disable-line @typescript-eslint/no-unused-vars
  projectStatus,
  tab,
  jobCounts,
  recentJobs,
  uploads,
}: ProjectTabsProps) {
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  const orgPrefix = orgSlug ? `/${orgSlug}` : "";

  return (
    <div className="space-y-6">
      {/* 탭 내비게이션 */}
      <div className="flex gap-1 rounded-lg border bg-muted/50 p-1 w-fit">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`${orgPrefix}/projects/${projectId}?tab=${t.value}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {tab === "overview" && (
        <OverviewTab
          projectId={projectId}
          projectStatus={projectStatus}
          jobCounts={jobCounts}
          recentJobs={recentJobs}
        />
      )}
      {tab === "jobs" && <JobsTab projectId={projectId} />}
      {tab === "uploads" && <UploadsTab uploads={uploads} />}
    </div>
  );
}
