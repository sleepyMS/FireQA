export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DiagramResults } from "@/components/diagrams/diagram-results";
import { JobStatusDisplay } from "@/components/job-status-display";
import { JobStatus } from "@/types/enums";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { CommentSection } from "@/components/comments/comment-section";

export default async function DiagramResultPage({
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
          {job.project.name} - 다이어그램
        </h2>
        <p className="text-muted-foreground">
          {job.upload.fileName} 기반으로 생성된 다이어그램입니다.
        </p>
      </div>

      <JobStatusDisplay
        status={job.status}
        error={job.error}
        loadingMessage="다이어그램을 생성하고 있습니다..."
      />

      {job.status === JobStatus.COMPLETED && result && (
        <>
          <div className="flex flex-wrap gap-2">
            <a href={`/api/export/mermaid?jobId=${job.id}`} download>
              <span className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
                Mermaid 다운로드
              </span>
            </a>
            <a href={`/api/export/json?jobId=${job.id}`} download>
              <span className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
                JSON 내보내기
              </span>
            </a>
          </div>
          <DiagramResults jobId={job.id} diagrams={result.diagrams} />
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
