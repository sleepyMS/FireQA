export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DiagramResults } from "@/components/diagrams/diagram-results";
import { JobStatusDisplay } from "@/components/job-status-display";
import { JobStatus } from "@/types/enums";

export default async function DiagramResultPage({
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
        <DiagramResults jobId={job.id} diagrams={result.diagrams} />
      )}
    </div>
  );
}
