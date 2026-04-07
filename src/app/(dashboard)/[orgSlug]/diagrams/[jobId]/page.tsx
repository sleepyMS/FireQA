export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DiagramResults } from "@/components/diagrams/diagram-results";
import { JobStatusDisplay } from "@/components/job-status-display";
import { JobStatus } from "@/types/enums";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { CommentSection } from "@/components/comments/comment-section";
import { ExportButton } from "@/components/ui/export-button";
import { FigmaCompletion } from "@/components/figma-completion";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { SetCurrentProject } from "@/components/set-current-project";

export default async function DiagramResultPage({
  params,
}: {
  params: Promise<{ orgSlug: string; jobId: string }>;
}) {
  const { orgSlug, jobId } = await params;
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

  let agentTaskId: string | null = null;
  try {
    const config = job.config ? JSON.parse(job.config) : {};
    if (config.executionMode === "agent") agentTaskId = config.agentTaskId ?? null;
  } catch { /* ignore */ }

  return (
    <div className="space-y-6">
      <SetCurrentProject projectId={job.project.id} />
      <Breadcrumb
        items={[
          { label: "프로젝트", href: `/${orgSlug}/projects` },
          { label: job.project.name, href: `/${orgSlug}/projects/${job.project.id}` },
          { label: "다이어그램 결과" },
        ]}
      />

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
        agentTaskId={agentTaskId}
        orgSlug={orgSlug}
      />

      {job.status === JobStatus.COMPLETED && result && result.figma && (
        <FigmaCompletion
          description="다이어그램"
          figmaFileKey={result.figmaFileKey}
          summary={result.summary}
        />
      )}

      {job.status === JobStatus.COMPLETED && result && !result.figma && (
        <>
          <div className="flex flex-wrap gap-2">
            <ExportButton href={`/api/export/mermaid?jobId=${job.id}`} label="Mermaid 다운로드" />
            <ExportButton href={`/api/export/json?jobId=${job.id}`} label="JSON 내보내기" />
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
