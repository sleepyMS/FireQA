export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SpecImproveResults } from "@/components/spec-improve/spec-improve-results";
import { JobStatusDisplay } from "@/components/job-status-display";
import { JobStatus } from "@/types/enums";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { CommentSection } from "@/components/comments/comment-section";

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

  const result = job.result ? JSON.parse(job.result) : null;

  return (
    <div className="space-y-6">
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
        <SpecImproveResults
          jobId={job.id}
          markdown={result.markdown}
          summary={result.summary}
          originalFileName={job.upload.fileName}
        />
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
