import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { randomBytes, createHash } from "crypto";

const PLUGIN_TOKEN_NAME = "Figma Plugin";

// GET — 토큰 존재 여부 확인 (실제 토큰 값은 반환하지 않음)
export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const token = await prisma.apiToken.findFirst({
    where: { userId: user.userId, name: PLUGIN_TOKEN_NAME },
    select: { createdAt: true, lastUsedAt: true },
  });

  return NextResponse.json({
    hasToken: !!token,
    lastUsedAt: token?.lastUsedAt ?? null,
    createdAt: token?.createdAt ?? null,
  });
}

// POST — 새 토큰 발급 (기존 토큰 자동 폐기)
export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  await prisma.apiToken.deleteMany({
    where: { userId: user.userId, name: PLUGIN_TOKEN_NAME },
  });

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  await prisma.apiToken.create({
    data: { userId: user.userId, name: PLUGIN_TOKEN_NAME, tokenHash },
  });

  return NextResponse.json({ token: rawToken });
}

// DELETE — 토큰 폐기
export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  await prisma.apiToken.deleteMany({
    where: { userId: user.userId, name: PLUGIN_TOKEN_NAME },
  });

  return NextResponse.json({ success: true });
}
