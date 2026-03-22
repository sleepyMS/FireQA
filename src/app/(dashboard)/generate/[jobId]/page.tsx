export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { TestCaseResults } from "@/components/test-cases/test-case-results";

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

      {job.status === "processing" && (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p>테스트케이스를 생성하고 있습니다...</p>
          </div>
        </div>
      )}

      {job.status === "failed" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <p className="font-medium">생성에 실패했습니다.</p>
          {job.error && <p className="mt-2 text-sm">{job.error}</p>}
        </div>
      )}

      {job.status === "completed" && result && (
        <TestCaseResults
          jobId={job.id}
          projectName={job.project.name}
          sheets={result.sheets}
        />
      )}
    </div>
  );
}
