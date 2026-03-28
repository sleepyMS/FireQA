import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { logActivity } from "@/lib/activity/log-activity";
import { ActivityAction } from "@/types/enums";

// PATCH /api/versions/[id]/activate — set a version as the active version
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const { id } = await params;
    const version = await prisma.resultVersion.findUnique({
      where: { id },
      include: { job: { include: { project: true } } },
    });
    if (!version || version.job.project.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
    }

    // Deactivate all, activate this one, update job result
    await prisma.$transaction([
      prisma.resultVersion.updateMany({ where: { jobId: version.jobId, isActive: true }, data: { isActive: false } }),
      prisma.resultVersion.update({ where: { id }, data: { isActive: true } }),
      prisma.generationJob.update({ where: { id: version.jobId }, data: { result: version.resultJson } }),
    ]);
    logActivity({ organizationId: user.organizationId, actorId: user.userId, action: ActivityAction.VERSION_ACTIVATED, jobId: version.jobId, metadata: { versionId: id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("버전 활성화 오류:", error);
    return NextResponse.json({ error: "버전 활성화에 실패했습니다." }, { status: 500 });
  }
}
