import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { AgentTaskStatus } from "@/types/agent";

const CANCELLABLE_STATUSES = [
  AgentTaskStatus.PENDING,
  AgentTaskStatus.ASSIGNED,
  AgentTaskStatus.RUNNING,
];

// DELETE — 사용자가 작업을 취소
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const task = await prisma.agentTask.findUnique({ where: { id } });

    if (!task || task.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: "작업을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (!CANCELLABLE_STATUSES.includes(task.status as (typeof CANCELLABLE_STATUSES)[number])) {
      return NextResponse.json(
        { error: "이미 종료된 작업은 취소할 수 없습니다." },
        { status: 400 }
      );
    }

    const updated = await prisma.agentTask.update({
      where: { id },
      data: {
        status: AgentTaskStatus.CANCELLED,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ status: updated.status });
  } catch (error) {
    console.error("작업 취소 오류:", error);
    return NextResponse.json(
      { error: "작업 취소에 실패했습니다." },
      { status: 500 }
    );
  }
}
