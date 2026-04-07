export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { JobStatusDisplay } from "@/components/job-status-display";
import { WireframeResults } from "@/components/wireframes/wireframe-results";
import { JobStatus } from "@/types/enums";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { CommentSection } from "@/components/comments/comment-section";
import { FigmaCompletion } from "@/components/figma-completion";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { SetCurrentProject } from "@/components/set-current-project";

export default async function WireframeResultPage({
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

  const result = job.result ? JSON.parse(job.result) : null;

  let agentTaskId: string | null = null;
  try {
    const config = job.config ? JSON.parse(job.config) : {};
    if (config.executionMode === "agent") agentTaskId = config.agentTaskId ?? null;
  } catch { /* ignore */ }

  return (
    <div className="min-w-0 space-y-6">
      <SetCurrentProject projectId={job.project.id} />
      <Breadcrumb
        items={[
          { label: "프로젝트", href: `/${orgSlug}/projects` },
          { label: job.project.name, href: `/${orgSlug}/projects/${job.project.id}` },
          { label: "와이어프레임 결과" },
        ]}
      />

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
        agentTaskId={agentTaskId}
        orgSlug={orgSlug}
      />

      {job.status === JobStatus.COMPLETED && result && result.figma && (
        <FigmaCompletion
          description="와이어프레임"
          figmaFileKey={result.figmaFileKey}
          summary={result.summary}
        />
      )}

      {job.status === JobStatus.COMPLETED && result && !result.figma && (
        <WireframeResults
          jobId={job.id}
          screens={result.screens || []}
          flows={result.flows || []}
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
