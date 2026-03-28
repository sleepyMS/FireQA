import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/db";
import { HistoryClient, type Job } from "./history-client";

const jobSelect = {
  id: true,
  type: true,
  status: true,
  tokenUsage: true,
  createdAt: true,
  projectId: true,
  error: true,
  project: { select: { id: true, name: true } },
  upload: { select: { fileName: true } },
} as const;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/onboarding");

  const { type = "" } = await searchParams;

  const jobs = await prisma.generationJob.findMany({
    where: {
      project: { organizationId: user.organizationId },
      ...(type ? { type } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: jobSelect,
    take: 51,
  });

  const hasMore = jobs.length === 51;
  const initialJobs: Job[] = jobs.slice(0, 50).map((j) => ({
    id: j.id,
    type: j.type,
    status: j.status,
    tokenUsage: j.tokenUsage,
    createdAt: j.createdAt.toISOString(),
    project: j.project,
    upload: j.upload,
  }));

  return <HistoryClient initialJobs={initialJobs} initialHasMore={hasMore} type={type} />;
}
