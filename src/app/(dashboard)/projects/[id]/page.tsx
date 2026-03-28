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
  const user = await getCurrentUser();
  if (!user) redirect("/onboarding");

  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  const tab = rawTab ?? "overview";

  // 프로젝트 조회 (조직 필터 포함)
  const project = await prisma.project.findUnique({
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
  });

  if (!project || project.organizationId !== user.organizationId) {
    notFound();
  }

  // 타입별 job 건수 집계 (개요 탭 통계 카드용)
  // projectId만으로 필터: 위에서 이미 project.organizationId 검증 완료
  const jobCountRows = await prisma.generationJob.groupBy({
    by: ["type"],
    where: { projectId: id },
    _count: { type: true },
  });
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
