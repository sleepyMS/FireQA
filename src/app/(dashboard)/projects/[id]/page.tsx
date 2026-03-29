export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ProjectHeaderClient } from "./project-header-client";
import { ProjectTabs } from "./project-tabs";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Trash2, Archive } from "lucide-react";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function ProjectDetailPage({
  params,
  searchParams,
}: PageProps) {
  // params·searchParams·인증을 동시에 해소하여 순차 대기 제거
  const [{ id }, { tab: rawTab }, user] = await Promise.all([
    params,
    searchParams,
    getCurrentUser(),
  ]);

  if (!user) redirect("/onboarding");
  const tab = rawTab ?? "overview";

  // 프로젝트 조회와 타입별 통계를 병렬 실행 — 순차 실행 대비 ~100ms 절감
  const [project, jobCountRows] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        jobs: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, type: true, status: true, createdAt: true },
        },
        uploads: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            createdAt: true,
          },
        },
      },
    }),
    // projectId만으로 필터: 아래 organizationId 검증이 무효 프로젝트를 걸러냄
    prisma.generationJob.groupBy({
      by: ["type"],
      where: { projectId: id },
      _count: { type: true },
    }),
  ]);

  if (!project || project.organizationId !== user.organizationId) {
    notFound();
  }

  const jobCounts: Record<string, number> = {};
  for (const row of jobCountRows) {
    jobCounts[row.type] = row._count.type;
  }

  // 날짜를 ISO string으로 직렬화하여 클라이언트 컴포넌트에 전달
  const projectData = {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    createdAt: project.createdAt.toISOString(),
    archivedAt: project.archivedAt ? project.archivedAt.toISOString() : null,
  };

  const recentJobs = project.jobs.map((j) => ({
    id: j.id,
    type: j.type,
    status: j.status,
    createdAt: j.createdAt.toISOString(),
  }));

  const uploads = project.uploads.map((u) => ({
    id: u.id,
    fileName: u.fileName,
    fileType: u.fileType,
    fileSize: u.fileSize,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "프로젝트", href: "/projects" },
          { label: project.name },
        ]}
      />

      {/* 삭제/보관 상태 배너 */}
      {project.status === "deleted" && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <Trash2 className="h-4 w-4 shrink-0" />
          이 프로젝트는 삭제되었습니다. 이력과 파일은 열람할 수 있지만 새로운 생성은 불가합니다.
        </div>
      )}
      {project.status === "archived" && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
          <Archive className="h-4 w-4 shrink-0" />
          이 프로젝트는 보관 중입니다.
        </div>
      )}

      {/* 헤더 — 클라이언트 컴포넌트 (인라인 편집, 보관, 삭제) */}
      <ProjectHeaderClient project={projectData} projectId={id} />

      {/* 탭 — URL 기반 탭 전환 */}
      <ProjectTabs
        projectId={id}
        projectName={project.name}
        projectStatus={project.status}
        tab={tab}
        jobCounts={jobCounts}
        recentJobs={recentJobs}
        uploads={uploads}
      />
    </div>
  );
}
