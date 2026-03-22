export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { TestCaseResults } from "@/components/test-cases/test-case-results";
import { JobStatusDisplay } from "@/components/job-status-display";
import { JobStatus } from "@/types/enums";

export default async function GenerateResultPage({
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
        <TestCaseResults
          jobId={job.id}
          projectName={job.project.name}
          sheets={result.sheets}
        />
      )}
    </div>
  );
}
