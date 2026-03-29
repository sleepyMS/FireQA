export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { TestCaseResults } from "@/components/test-cases/test-case-results";
import { JobStatusDisplay } from "@/components/job-status-display";
import { JobStatus } from "@/types/enums";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { CommentSection } from "@/components/comments/comment-section";
import { ExportButton } from "@/components/ui/export-button";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export default async function GenerateResultPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const [job, currentUser] = await Promise.all([
    prisma.generationJob.findUnique({
      where: { id: jobId },
      include: { project: true, upload: true },
    }),
    getCurrentUser(),
  ]);

  if (!job) notFound();
  if (!currentUser || job.project.organizationId !== currentUser.organizationId) notFound();

  let result = null;
  if (job.result) {
    try { result = JSON.parse(job.result); } catch { /* malformed — treat as no result */ }
  }

  return (
    <div className="min-w-0 space-y-6">
      <Breadcrumb
        items={[
          { label: "프로젝트", href: "/projects" },
          { label: job.project.name, href: `/projects/${job.project.id}` },
          { label: "TC 생성 결과" },
        ]}
      />

      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {job.project.name} - TC 생성 결과
        </h2>
        <p className="text-muted-foreground">
          {job.upload.fileName} 기반으로 생성된 테스트케이스입니다.
        </p>
      </div>

      <JobStatusDisplay
        status={job.status}
        error={job.error}
        loadingMessage="테스트케이스를 생성하고 있습니다..."
      />

      {job.status === JobStatus.COMPLETED && result && (
        <>
          <div className="flex flex-wrap gap-2">
            <ExportButton href={`/api/export/json?jobId=${job.id}`} label="JSON 내보내기" />
          </div>
          <TestCaseResults
            jobId={job.id}
            projectName={job.project.name}
            sheets={result.sheets}
          />
        </>
      )}

      <div className="mt-8 border-t pt-6">
        <CommentSection
          jobId={job.id}
          currentUserId={currentUser?.userId ?? null}
        />
      </div>
    </div>
  );
}
