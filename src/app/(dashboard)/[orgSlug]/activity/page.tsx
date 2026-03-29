import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/db";
import { ActivityTimeline } from "@/components/activity/activity-timeline";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/onboarding");

  const { projectId } = await searchParams;

  const projectRow = projectId
    ? await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } })
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          활동 로그{projectRow ? ` — ${projectRow.name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          {projectId ? `${projectRow?.name ?? "이 프로젝트"}의 활동 기록` : "조직의 전체 활동 기록"}
        </p>
      </div>
      <ActivityTimeline projectId={projectId} />
    </div>
  );
}
