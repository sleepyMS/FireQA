export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { JobStatusDisplay } from "@/components/job-status-display";
import { WireframeResults } from "@/components/wireframes/wireframe-results";
import { JobStatus } from "@/types/enums";

export default async function WireframeResultPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    include: { project: true, upload: true },
  });

  if (!job) notFound();

  const result = job.result ? JSON.parse(job.result) : null;

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {job.project.name} - 와이어프레임
        </h2>
        <p className="text-muted-foreground">
          {job.upload.fileName} 기반으로 설계된 화면 구성입니다.
        </p>
      </div>

      <JobStatusDisplay
        status={job.status}
        error={job.error}
        loadingMessage="와이어프레임을 생성하고 있습니다..."
      />

      {job.status === JobStatus.COMPLETED && result && (
        <WireframeResults
          jobId={job.id}
          screens={result.screens || []}
          flows={result.flows || []}
        />
      )}
    </div>
  );
}
