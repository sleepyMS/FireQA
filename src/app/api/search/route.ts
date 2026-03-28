import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";

const MAX_RESULTS = 5;

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 1 || q.length > 100) {
      return NextResponse.json({ projects: [], jobs: [], comments: [] });
    }

    const [projects, jobs, comments] = await Promise.all([
      prisma.project.findMany({
        where: {
          organizationId: user.organizationId,
          status: { not: "deleted" },
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, description: true, status: true },
        take: MAX_RESULTS,
      }),
      prisma.generationJob.findMany({
        where: {
          project: {
            organizationId: user.organizationId,
            name: { contains: q, mode: "insensitive" },
          },
        },
        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
          project: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: MAX_RESULTS,
      }),
      prisma.comment.findMany({
        where: {
          organizationId: user.organizationId,
          deletedAt: null,
          body: { contains: q, mode: "insensitive" },
        },
        select: { id: true, body: true, jobId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: MAX_RESULTS,
      }),
    ]);

    return NextResponse.json({
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
      })),
      jobs: jobs.map((j) => ({
        id: j.id,
        type: j.type,
        status: j.status,
        projectName: j.project.name,
        createdAt: j.createdAt.toISOString(),
      })),
      comments: comments.map((c) => ({
        id: c.id,
        body: c.body.length > 100 ? c.body.slice(0, 100) + "…" : c.body,
        jobId: c.jobId,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("검색 오류:", error);
    return NextResponse.json({ error: "검색에 실패했습니다." }, { status: 500 });
  }
}
