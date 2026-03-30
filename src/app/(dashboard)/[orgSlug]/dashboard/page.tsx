export const dynamic = "force-dynamic";

import Link from "next/link";
import { FileText, GitBranch, Smartphone, Clock, Plus, FileEdit, ChevronRight } from "lucide-react";
import { STATUS_CONFIG, JOB_TYPE_LABEL, JOB_TYPE_PATH, JobType, JobStatus } from "@/types/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { RecentProjectsPanel } from "@/components/projects/recent-projects-panel";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const user = await getCurrentUser();
  const orgFilter = user ? { organizationId: user.organizationId } : undefined;

  const [projectCount, jobCount, recentJobs, recentProjects] = await Promise.all([
    prisma.project.count({ where: orgFilter }),
    prisma.generationJob.count({
      where: { status: JobStatus.COMPLETED, project: orgFilter },
    }),
    prisma.generationJob.findMany({
      where: { project: orgFilter },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        project: { select: { name: true } },
        upload: { select: { fileName: true } },
      },
    }),
    prisma.project.findMany({
      where: { ...orgFilter, status: "active", deletedAt: null },
      take: 5,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { jobs: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">대시보드</h2>
          <p className="text-muted-foreground">
            기획 문서로 TC, 다이어그램, 와이어프레임을 자동 생성하거나 기획서를 개선하세요.
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href={`/${orgSlug}/generate`}>
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="rounded-lg bg-blue-100 p-3">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">TC 자동 생성</CardTitle>
                <p className="text-sm text-muted-foreground">
                  기획 문서를 업로드하여 테스트케이스를 생성합니다
                </p>
              </div>
            </CardHeader>
          </Card>
        </Link>
        <Link href={`/${orgSlug}/diagrams`}>
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="rounded-lg bg-purple-100 p-3">
                <GitBranch className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-base">다이어그램 생성</CardTitle>
                <p className="text-sm text-muted-foreground">
                  사용자 플로우와 상태 다이어그램을 FigJam에 생성합니다
                </p>
              </div>
            </CardHeader>
          </Card>
        </Link>
        <Link href={`/${orgSlug}/wireframes`}>
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="rounded-lg bg-pink-100 p-3">
                <Smartphone className="h-6 w-6 text-pink-600" />
              </div>
              <div>
                <CardTitle className="text-base">와이어프레임 생성</CardTitle>
                <p className="text-sm text-muted-foreground">
                  화면 UI 구성과 흐름도를 Figma에 생성합니다
                </p>
              </div>
            </CardHeader>
          </Card>
        </Link>
        <Link href={`/${orgSlug}/improve`}>
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="rounded-lg bg-emerald-100 p-3">
                <FileEdit className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">기획서 개선</CardTitle>
                <p className="text-sm text-muted-foreground">
                  기획서를 모범 구조로 자동 개선합니다
                </p>
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              프로젝트
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{projectCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              완료된 생성
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{jobCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              최근 활동
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{recentJobs.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent sections: 최근 프로젝트 + 최근 생성 이력 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentProjectsPanel initialProjects={recentProjects.map((p) => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        }))} />

        {/* Recent Jobs */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-muted-foreground" />
                최근 생성 이력
              </CardTitle>
              <Link href={`/${orgSlug}/history`}>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                  전체 보기
                  <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Plus className="mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm">아직 생성 이력이 없습니다.</p>
                <p className="mt-1 text-xs">TC 생성 또는 다이어그램 생성을 시작해보세요.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/${orgSlug}${JOB_TYPE_PATH[job.type] || "/generate"}/${job.id}`}
                    className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-sm"
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      job.type === JobType.TEST_CASES ? "bg-blue-50" :
                      job.type === JobType.WIREFRAMES ? "bg-pink-50" :
                      job.type === JobType.SPEC_IMPROVE ? "bg-emerald-50" :
                      "bg-purple-50"
                    }`}>
                      {job.type === JobType.TEST_CASES ? (
                        <FileText className="h-4 w-4 text-blue-600" />
                      ) : job.type === JobType.WIREFRAMES ? (
                        <Smartphone className="h-4 w-4 text-pink-600" />
                      ) : job.type === JobType.SPEC_IMPROVE ? (
                        <FileEdit className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <GitBranch className="h-4 w-4 text-purple-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{job.project.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {job.upload.fileName} &middot; {JOB_TYPE_LABEL[job.type] || job.type}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs font-medium ${
                      job.status === JobStatus.COMPLETED ? "text-green-600" :
                      job.status === JobStatus.FAILED ? "text-red-600" :
                      "text-yellow-600"
                    }`}>
                      {STATUS_CONFIG[job.status]?.label || job.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
