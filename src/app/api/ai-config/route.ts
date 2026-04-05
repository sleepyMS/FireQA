import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { AGENT_MODEL_OPTIONS } from "@/hooks/use-agent-model";

const DEFAULTS = {
  executionMode: "server",
  serverModel: "gpt-4.1-mini",
  agentConnectionId: null,
  agentModel: null,
};

const HEARTBEAT_FRESH_MS = 30_000;

function buildResponse(config: {
  executionMode: string;
  serverModel: string;
  agentConnectionId: string | null;
  agentModel: string | null;
  agentConnection?: {
    id: string;
    name: string;
    status: string;
    lastHeartbeat: Date | null;
    metadata: string;
  } | null;
}) {
  const conn = config.agentConnection ?? null;
  // status 필드 대신 heartbeat 시각으로 실제 온라인 여부 판단 (크론 없이 stale 방지)
  const isOnline = conn?.lastHeartbeat != null
    && (Date.now() - new Date(conn.lastHeartbeat).getTime()) < HEARTBEAT_FRESH_MS;

  return {
    executionMode: config.executionMode,
    serverModel: config.serverModel,
    agentConnectionId: config.agentConnectionId,
    agentModel: config.agentModel,
    agentConnection: conn
      ? {
          id: conn.id,
          name: conn.name,
          status: isOnline ? "online" : "offline",
          metadata: JSON.parse(conn.metadata || "{}"),
        }
      : null,
  };
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const config = await prisma.aIConfig.findUnique({
    where: { organizationId: user.organizationId },
    include: { agentConnection: true },
  });

  if (!config) return NextResponse.json(buildResponse({ ...DEFAULTS, agentConnection: null }));

  return NextResponse.json(buildResponse(config));
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const body = await request.json();
  const { executionMode, serverModel, agentConnectionId, agentModel } = body as {
    executionMode: string;
    serverModel?: string;
    agentConnectionId?: string | null;
    agentModel?: string | null;
  };

  // 유효성 검증
  if (executionMode !== "server" && executionMode !== "agent") {
    return NextResponse.json({ error: "올바르지 않은 실행 방식입니다." }, { status: 400 });
  }

  if (executionMode === "agent") {
    if (!agentConnectionId) {
      return NextResponse.json({ error: "에이전트를 선택해주세요." }, { status: 400 });
    }

    // 해당 connection이 이 org 소속이고 online인지 확인
    const conn = await prisma.agentConnection.findFirst({
      where: { id: agentConnectionId, organizationId: user.organizationId },
    });

    if (!conn) {
      return NextResponse.json({ error: "선택한 에이전트를 찾을 수 없습니다." }, { status: 400 });
    }

    if (conn.status !== "online") {
      return NextResponse.json({ error: "선택한 에이전트가 현재 오프라인입니다. 에이전트를 실행한 후 다시 시도하세요." }, { status: 400 });
    }

    // 모델이 해당 CLI 타입에 유효한지 확인
    if (agentModel) {
      const metadata = JSON.parse(conn.metadata || "{}") as { cli?: string };
      const cliType = metadata.cli as keyof typeof AGENT_MODEL_OPTIONS | undefined;
      if (cliType && cliType in AGENT_MODEL_OPTIONS) {
        const validModels = AGENT_MODEL_OPTIONS[cliType].map((m) => m.value);
        if (!validModels.includes(agentModel as never)) {
          return NextResponse.json(
            { error: `선택한 모델(${agentModel})은 ${cliType} CLI와 호환되지 않습니다.` },
            { status: 400 }
          );
        }
      }
    }
  }

  const saved = await prisma.aIConfig.upsert({
    where: { organizationId: user.organizationId },
    create: {
      organizationId: user.organizationId,
      executionMode,
      serverModel: serverModel ?? DEFAULTS.serverModel,
      agentConnectionId: executionMode === "agent" ? (agentConnectionId ?? null) : null,
      agentModel: executionMode === "agent" ? (agentModel ?? null) : null,
    },
    update: {
      executionMode,
      serverModel: serverModel ?? DEFAULTS.serverModel,
      agentConnectionId: executionMode === "agent" ? (agentConnectionId ?? null) : null,
      agentModel: executionMode === "agent" ? (agentModel ?? null) : null,
    },
    include: { agentConnection: true },
  });

  return NextResponse.json(buildResponse(saved));
}
