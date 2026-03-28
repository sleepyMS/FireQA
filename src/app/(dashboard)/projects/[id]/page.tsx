export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ProjectHeaderClient } from "./project-header-client";
import { ProjectTabs } from "./project-tabs";

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
      {/* 헤더 — 클라이언트 컴포넌트 (인라인 편집, 보관, 삭제) */}
      <ProjectHeaderClient project={projectData} projectId={id} />

      {/* 탭 — URL 기반 탭 전환 */}
      <ProjectTabs
        projectId={id}
        projectName={project.name}
        tab={tab}
        jobCounts={jobCounts}
        recentJobs={recentJobs}
        uploads={uploads}
      />
    </div>
  );
}
