import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { AgentTaskStatus } from "@/types/agent";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const connectionId = request.nextUrl.searchParams.get("connectionId");
    if (!connectionId) {
      return NextResponse.json(
        { error: "connectionId는 필수입니다." },
        { status: 400 }
      );
    }

    // Atomic claim via PostgreSQL FOR UPDATE SKIP LOCKED
    const tasks = await prisma.$queryRaw<
      Array<{
        id: string;
        type: string;
        prompt: string;
        context: string;
        mcpTools: string;
        sessionId: string | null;
        timeoutMs: number;
        projectId: string | null;
      }>
    >`
      UPDATE "AgentTask"
      SET status = ${AgentTaskStatus.ASSIGNED},
          "connectionId" = ${connectionId},
          "updatedAt" = NOW()
      WHERE id = (
        SELECT id FROM "AgentTask"
        WHERE status = ${AgentTaskStatus.PENDING}
          AND "organizationId" = ${user.organizationId}
        ORDER BY priority DESC, "createdAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, type, prompt, context, "mcpTools", "sessionId", "timeoutMs", "projectId"
    `;

    if (tasks.length === 0) {
      return NextResponse.json({ task: null });
    }

    const task = tasks[0];
    return NextResponse.json({
      task: {
        id: task.id,
        type: task.type,
        prompt: task.prompt,
        context: JSON.parse(task.context),
        mcpTools: JSON.parse(task.mcpTools),
        sessionId: task.sessionId,
        timeoutMs: task.timeoutMs,
        projectId: task.projectId,
      },
    });
  } catch (error) {
    console.error("작업 수령 오류:", error);
    return NextResponse.json(
      { error: "작업 수령에 실패했습니다." },
      { status: 500 }
    );
  }
}
