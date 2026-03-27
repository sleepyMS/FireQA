export const dynamic = "force-dynamic";

import Link from "next/link";
import { FileText, GitBranch, Smartphone, Clock, Plus, FileEdit } from "lucide-react";
import { STATUS_CONFIG, JOB_TYPE_LABEL, JobType, JobStatus } from "@/types/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const orgFilter = user ? { organizationId: user.organizationId } : undefined;

  const [projectCount, jobCount, recentJobs] = await Promise.all([
    prisma.project.count({ where: orgFilter }),
    prisma.generationJob.count({
      where: { status: JobStatus.COMPLETED, project: orgFilter },
    }),
    prisma.generationJob.findMany({
      where: { project: orgFilter },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { project: true, upload: true },
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
        <Link href="/generate">
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
        <Link href="/diagrams">
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
        <Link href="/wireframes">
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
        <Link href="/improve">
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

      {/* Recent Jobs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>최근 생성 이력</CardTitle>
          <Link href="/history">
            <Button variant="ghost" size="sm">
              <Clock className="mr-2 h-4 w-4" />
              전체 보기
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Plus className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                아직 생성 이력이 없습니다.
              </p>
              <p className="text-sm text-muted-foreground">
                TC 생성 또는 다이어그램 생성을 시작해보세요.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    {job.type === JobType.TEST_CASES ? (
                      <FileText className="h-4 w-4 text-blue-600" />
                    ) : job.type === JobType.WIREFRAMES ? (
                      <Smartphone className="h-4 w-4 text-pink-600" />
                    ) : job.type === JobType.SPEC_IMPROVE ? (
                      <FileEdit className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <GitBranch className="h-4 w-4 text-purple-600" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {job.project.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {job.upload.fileName} &middot;{" "}
                        {JOB_TYPE_LABEL[job.type] || job.type}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      job.status === JobStatus.COMPLETED
                        ? "text-green-600"
                        : job.status === JobStatus.FAILED
                          ? "text-red-600"
                          : "text-yellow-600"
                    }`}
                  >
                    {STATUS_CONFIG[job.status]?.label || job.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
