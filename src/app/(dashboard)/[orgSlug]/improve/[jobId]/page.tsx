export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SpecImproveResults } from "@/components/spec-improve/spec-improve-results";
import { JobStatusDisplay } from "@/components/job-status-display";
import { JobStatus } from "@/types/enums";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { CommentSection } from "@/components/comments/comment-section";
import { ExportButton } from "@/components/ui/export-button";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export default async function SpecImproveResultPage({
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
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "프로젝트", href: "/projects" },
          { label: job.project.name, href: `/projects/${job.project.id}` },
          { label: "기획서 개선 결과" },
        ]}
      />

      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {job.project.name} - 기획서 개선 결과
        </h2>
        <p className="text-muted-foreground">
          {job.upload.fileName} 기반으로 개선된 기획서입니다.
        </p>
      </div>

      <JobStatusDisplay
        status={job.status}
        error={job.error}
        loadingMessage="기획서를 개선하고 있습니다..."
      />

      {job.status === JobStatus.COMPLETED && result && (
        <>
          <div className="flex flex-wrap gap-2">
            <ExportButton href={`/api/export/markdown?jobId=${job.id}`} label="Markdown 다운로드" />
            <ExportButton href={`/api/export/json?jobId=${job.id}`} label="JSON 내보내기" />
          </div>
          <SpecImproveResults
            jobId={job.id}
            markdown={result.markdown}
            summary={result.summary}
            originalFileName={job.upload.fileName}
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
