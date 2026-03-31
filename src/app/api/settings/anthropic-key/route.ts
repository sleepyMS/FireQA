import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { encrypt } from "@/lib/crypto/encrypt";

// GET — 현재 조직에 등록된 Anthropic API Key 정보 조회 (prefix만 반환)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const record = await prisma.userApiKey.findUnique({
      where: {
        organizationId_provider: {
          organizationId: user.organizationId,
          provider: "anthropic",
        },
      },
      select: { keyPrefix: true, updatedAt: true },
    });

    if (!record) {
      return NextResponse.json({ hasKey: false });
    }

    return NextResponse.json({
      hasKey: true,
      keyPrefix: record.keyPrefix,
      updatedAt: record.updatedAt,
    });
  } catch (error) {
    console.error("Anthropic Key 조회 오류:", error);
    return NextResponse.json({ error: "키 조회에 실패했습니다." }, { status: 500 });
  }
}

// POST — Anthropic API Key 저장 (upsert)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { apiKey } = body as { apiKey?: string };

    if (!apiKey) {
      return NextResponse.json({ error: "API Key는 필수입니다." }, { status: 400 });
    }

    // "sk-ant-" 또는 "sk-" 접두사 검증
    if (!apiKey.startsWith("sk-ant-") && !apiKey.startsWith("sk-")) {
      return NextResponse.json(
        { error: "올바른 Anthropic API Key 형식이 아닙니다. (sk-ant-... 또는 sk-...)" },
        { status: 400 },
      );
    }

    const encryptedKey = encrypt(apiKey);
    const keyPrefix = apiKey.slice(0, 12) + "...";

    await prisma.userApiKey.upsert({
      where: {
        organizationId_provider: {
          organizationId: user.organizationId,
          provider: "anthropic",
        },
      },
      create: {
        organizationId: user.organizationId,
        provider: "anthropic",
        encryptedKey,
        keyPrefix,
        createdById: user.userId,
      },
      update: {
        encryptedKey,
        keyPrefix,
        createdById: user.userId,
      },
    });

    return NextResponse.json(
      { hasKey: true, keyPrefix },
      { status: 201 },
    );
  } catch (error) {
    console.error("Anthropic Key 저장 오류:", error);
    return NextResponse.json({ error: "키 저장에 실패했습니다." }, { status: 500 });
  }
}

// DELETE — Anthropic API Key 삭제
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    await prisma.userApiKey.deleteMany({
      where: {
        organizationId: user.organizationId,
        provider: "anthropic",
      },
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Anthropic Key 삭제 오류:", error);
    return NextResponse.json({ error: "키 삭제에 실패했습니다." }, { status: 500 });
  }
}
