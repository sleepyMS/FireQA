import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { requireRole } from "@/lib/auth/require-role";
import { UserRole } from "@/types/enums";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const roleErr = requireRole(user.role, UserRole.ADMIN);
  if (roleErr) return NextResponse.json({ error: roleErr.error }, { status: roleErr.status });

  const { id } = await params;
  const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id } });
  if (!endpoint || endpoint.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "엔드포인트를 찾을 수 없습니다." }, { status: 404 });
  }

  const body = (await request.json()) as {
    url?: string;
    description?: string;
    events?: string[];
    isActive?: boolean;
  };

  if (body.url !== undefined && !body.url.startsWith("https://")) {
    return NextResponse.json({ error: "URL은 https://로 시작해야 합니다." }, { status: 400 });
  }

  const updated = await prisma.webhookEndpoint.update({
    where: { id },
    data: {
      ...(body.url !== undefined ? { url: body.url } : {}),
      ...(body.description !== undefined ? { description: body.description || null } : {}),
      ...(body.events !== undefined ? { events: JSON.stringify(body.events) } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    },
  });

  return NextResponse.json({
    id: updated.id,
    url: updated.url,
    description: updated.description,
    events: JSON.parse(updated.events) as string[],
    isActive: updated.isActive,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const roleErr = requireRole(user.role, UserRole.ADMIN);
  if (roleErr) return NextResponse.json({ error: roleErr.error }, { status: roleErr.status });

  const { id } = await params;
  const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id } });
  if (!endpoint || endpoint.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "엔드포인트를 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.webhookEndpoint.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
