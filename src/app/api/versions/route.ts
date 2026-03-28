import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { logActivity } from "@/lib/activity/log-activity";
import { ActivityAction } from "@/types/enums";

// GET /api/versions?jobId=xxx — list versions for a job
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const jobId = request.nextUrl.searchParams.get("jobId");
    if (!jobId) return NextResponse.json({ error: "jobId가 필요합니다." }, { status: 400 });

    // Verify job belongs to user's org
    const job = await prisma.generationJob.findFirst({
      where: { id: jobId, project: { organizationId: user.organizationId } },
    });
    if (!job) return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });

    const versions = await prisma.resultVersion.findMany({
      where: { jobId },
      select: {
        id: true,
        version: true,
        changeType: true,
        changeSummary: true,
        instruction: true,
        isActive: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { version: "asc" },
    });

    return NextResponse.json({ versions });
  } catch (error) {
    console.error("버전 조회 오류:", error);
    return NextResponse.json({ error: "버전 조회에 실패했습니다." }, { status: 500 });
  }
}

// POST /api/versions — create a new version manually
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const { jobId, changeType, changeSummary, instruction, resultJson } = await request.json() as {
      jobId: string;
      changeType: string;
      changeSummary?: string;
      instruction?: string;
      resultJson: string;
    };

    if (!jobId || !changeType || !resultJson) {
      return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
    }

    // job 소속 검증 + 최신 버전 번호 조회를 병렬로
    const [job, latest] = await Promise.all([
      prisma.generationJob.findFirst({
        where: { id: jobId, project: { organizationId: user.organizationId } },
      }),
      prisma.resultVersion.findFirst({
        where: { jobId },
        orderBy: { version: "desc" },
        select: { version: true },
      }),
    ]);
    if (!job) return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
    const nextVersion = (latest?.version ?? 0) + 1;

    // Deactivate all current versions, create new active one
    await prisma.resultVersion.updateMany({ where: { jobId, isActive: true }, data: { isActive: false } });

    const version = await prisma.resultVersion.create({
      data: {
        jobId,
        version: nextVersion,
        resultJson,
        changeType,
        changeSummary,
        instruction,
        isActive: true,
        createdById: user.userId,
      },
    });

    logActivity({ organizationId: user.organizationId, actorId: user.userId, action: ActivityAction.VERSION_CREATED, jobId, metadata: { changeType, version: version.version } });

    return NextResponse.json({ version });
  } catch (error) {
    console.error("버전 생성 오류:", error);
    return NextResponse.json({ error: "버전 생성에 실패했습니다." }, { status: 500 });
  }
}
