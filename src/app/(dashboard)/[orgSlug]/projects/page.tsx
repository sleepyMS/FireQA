// SSR 서버 컴포넌트: 초기 프로젝트 목록을 서버에서 미리 조회하여 클라이언트 JS 로드 전 렌더링
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/db";
import { ProjectsClient, type Project } from "./projects-client";

const PAGE_SIZE = 20;

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/onboarding");

  // 초기 뷰: active 상태 프로젝트 첫 페이지를 서버에서 직접 조회
  const items = await prisma.project.findMany({
    where: {
      organizationId: user.organizationId,
      status: "active",
      deletedAt: null,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    include: { _count: { select: { jobs: true, uploads: true } } },
  });

  const hasMore = items.length > PAGE_SIZE;
  if (hasMore) items.pop();

  const nextCursor = hasMore
    ? `${items[items.length - 1].createdAt.toISOString()}_${items[items.length - 1].id}`
    : null;

  // Date → ISO string 직렬화 (서버 → 클라이언트 전달용)
  const initialProjects: Project[] = items.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    archivedAt: p.archivedAt?.toISOString() ?? null,
    _count: p._count,
  }));

  return (
    <ProjectsClient
      initialProjects={initialProjects}
      initialNextCursor={nextCursor}
    />
  );
}
