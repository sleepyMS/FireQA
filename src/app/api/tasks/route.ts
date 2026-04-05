import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { logActivity } from "@/lib/activity/log-activity";
import { ActivityAction } from "@/types/enums";
import { AgentTaskType } from "@/types/agent";
import { deductCredits, addCredits, hasEnoughCredits } from "@/lib/billing/credits";
import { getTaskCreditCost } from "@/lib/billing/credit-pricing";
import { WorkerOrchestrator } from "@/lib/flyio/orchestrator";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "api/tasks" });

const VALID_TYPES = new Set(Object.values(AgentTaskType));

// POST — 작업 생성
export async function POST(request: NextRequest) {
  let creditsToRefund: { orgId: string; amount: number } | null = null;
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { type, projectId, prompt, context, mcpTools, mode } = body as {
      type: string;
      projectId?: string;
      prompt?: string;
      context?: Record<string, unknown>;
      mcpTools?: string[];
      mode?: "self_hosted" | "hosted";
    };

    if (!type || !VALID_TYPES.has(type as AgentTaskType)) {
      return NextResponse.json({ error: "유효하지 않은 작업 유형입니다." }, { status: 400 });
    }
    if (!prompt?.trim()) {
      return NextResponse.json({ error: "프롬프트는 필수입니다." }, { status: 400 });
    }

    if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project || project.organizationId !== user.organizationId) {
        return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
      }
    }

    const isHosted = mode === "hosted";

    // self_hosted 모드: 기존 로직 (온라인 에이전트 체크)
    if (!isHosted) {
      const onlineAgent = await prisma.agentConnection.findFirst({
        where: { organizationId: user.organizationId, status: "online" },
      });
      if (!onlineAgent) {
        return NextResponse.json(
          { error: "연결된 에이전트가 없습니다. fireqa-agent를 실행해주세요." },
          { status: 409 }
        );
      }
    }

    // hosted 모드: 크레딧 검증
    let creditsUsed: number | null = null;
    let useOwnApiKey = false;

    if (isHosted) {
      // 사용자 자체 API Key 여부 확인
      const userKey = await prisma.userApiKey.findUnique({
        where: { organizationId_provider: { organizationId: user.organizationId, provider: "anthropic" } },
      });
      useOwnApiKey = !!userKey;

      if (!useOwnApiKey) {
        const cost = getTaskCreditCost(type);
        const enough = await hasEnoughCredits(user.organizationId, cost);
        if (!enough) {
          return NextResponse.json(
            { error: "크레딧이 부족합니다. 크레딧을 충전하거나 자체 API Key를 등록해주세요." },
            { status: 402 }
          );
        }
        const result = await deductCredits(user.organizationId, cost, {
          type: "task_debit",
          description: `작업 생성: ${type}`,
        });
        if (!result.success) {
          return NextResponse.json({ error: "크레딧 차감에 실패했습니다." }, { status: 402 });
        }
        creditsUsed = cost;
        creditsToRefund = { orgId: user.organizationId, amount: cost };
      }
    }

    const task = await prisma.agentTask.create({
      data: {
        organizationId: user.organizationId,
        projectId: projectId ?? null,
        createdById: user.userId,
        type,
        prompt: prompt.trim(),
        context: JSON.stringify(context ?? {}),
        mcpTools: JSON.stringify(mcpTools ?? []),
        mode: isHosted ? "hosted" : "self_hosted",
        creditsUsed,
        useOwnApiKey,
      },
    });

    logActivity({
      organizationId: user.organizationId,
      actorId: user.userId,
      action: ActivityAction.AGENT_TASK_CREATED,
      projectId: projectId ?? undefined,
      metadata: { taskId: task.id, type, mode: isHosted ? "hosted" : "self_hosted" },
    });

    // hosted 모드: 워커 할당
    if (isHosted) {
      try {
        const orchestrator = new WorkerOrchestrator();
        await orchestrator.assignWorker({
          id: task.id,
          organizationId: user.organizationId,
          useOwnApiKey,
        });
      } catch {
        // 워커 할당 실패 시 크레딧 환불 + 작업 실패 처리
        if (creditsUsed) {
          await addCredits(user.organizationId, creditsUsed, {
            type: "refund",
            description: `워커 할당 실패 환불: ${task.id}`,
          });
          creditsToRefund = null;
        }
        await prisma.agentTask.update({
          where: { id: task.id },
          data: { status: "failed", errorMessage: "호스티드 워커 할당에 실패했습니다.", completedAt: new Date() },
        });
        return NextResponse.json(
          { error: "호스티드 워커 할당에 실패했습니다. 잠시 후 다시 시도해주세요." },
          { status: 503 }
        );
      }
    }

    creditsToRefund = null;
    return NextResponse.json(
      { id: task.id, type: task.type, status: task.status, mode: task.mode, createdAt: task.createdAt },
      { status: 201 }
    );
  } catch (error) {
    if (creditsToRefund) {
      await addCredits(creditsToRefund.orgId, creditsToRefund.amount, {
        type: "refund",
        description: "작업 생성 중 오류 발생 환불",
      }).catch(() => {});
    }
    logger.error("작업 생성 오류", { error });
    return NextResponse.json({ error: "작업 생성에 실패했습니다." }, { status: 500 });
  }
}

// GET — 작업 목록
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status") || undefined;
    const type = searchParams.get("type") || undefined;
    const projectId = searchParams.get("projectId") || undefined;
    const limitParam = parseInt(searchParams.get("limit") || "20", 10);
    const limit = isNaN(limitParam) || limitParam < 1 ? 20 : Math.min(limitParam, 100);

    const tasks = await prisma.agentTask.findMany({
      where: {
        organizationId: user.organizationId,
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true, type: true, status: true, prompt: true, projectId: true,
        connectionId: true, startedAt: true, completedAt: true, errorMessage: true, createdAt: true,
        project: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    logger.error("작업 목록 조회 오류", { error });
    return NextResponse.json({ error: "목록 조회에 실패했습니다." }, { status: 500 });
  }
}
