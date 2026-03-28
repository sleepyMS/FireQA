import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { requireRole } from "@/lib/auth/require-role";
import { UserRole } from "@/types/enums";
import { randomBytes } from "crypto";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const roleErr = requireRole(user.role, UserRole.ADMIN);
  if (roleErr) return NextResponse.json({ error: roleErr.error }, { status: roleErr.status });

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      url: true,
      description: true,
      events: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    endpoints: endpoints.map((ep) => ({
      ...ep,
      events: JSON.parse(ep.events) as string[],
    })),
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const roleErr = requireRole(user.role, UserRole.ADMIN);
  if (roleErr) return NextResponse.json({ error: roleErr.error }, { status: roleErr.status });

  const { url, description, events } = (await request.json()) as {
    url?: string;
    description?: string;
    events?: string[];
  };

  if (!url?.startsWith("https://")) {
    return NextResponse.json({ error: "URL은 https://로 시작해야 합니다." }, { status: 400 });
  }

  const MAX_ENDPOINTS = 10;
  const count = await prisma.webhookEndpoint.count({
    where: { organizationId: user.organizationId },
  });
  if (count >= MAX_ENDPOINTS) {
    return NextResponse.json(
      { error: `웹훅 엔드포인트는 최대 ${MAX_ENDPOINTS}개까지 등록할 수 있습니다.` },
      { status: 403 }
    );
  }

  const secret = randomBytes(32).toString("hex");

  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      organizationId: user.organizationId,
      url,
      secret,
      description: description?.trim() || null,
      events: JSON.stringify(events ?? []),
    },
  });

  return NextResponse.json(
    {
      id: endpoint.id,
      url: endpoint.url,
      description: endpoint.description,
      events: events ?? [],
      isActive: endpoint.isActive,
      createdAt: endpoint.createdAt,
      secret, // 생성 시 1회만 반환
    },
    { status: 201 }
  );
}
