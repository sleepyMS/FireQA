import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { randomBytes, createHash } from "crypto";

// POST — API Key 발급
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body as { name?: string };

    if (!name?.trim()) {
      return NextResponse.json({ error: "키 이름은 필수입니다." }, { status: 400 });
    }

    const rawToken = `fqa_${randomBytes(32).toString("hex")}`;
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const keyPrefix = rawToken.slice(0, 12);

    const apiKey = await prisma.apiToken.create({
      data: {
        userId: user.userId,
        name: name.trim(),
        tokenHash,
        keyPrefix,
      },
    });

    return NextResponse.json(
      {
        id: apiKey.id,
        name: apiKey.name,
        token: rawToken,
        keyPrefix,
        createdAt: apiKey.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("API Key 발급 오류:", error);
    return NextResponse.json({ error: "API Key 발급에 실패했습니다." }, { status: 500 });
  }
}

// GET — API Key 목록 (원문은 표시하지 않음)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const keys = await prisma.apiToken.findMany({
      where: { userId: user.userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ keys });
  } catch (error) {
    console.error("API Key 목록 조회 오류:", error);
    return NextResponse.json({ error: "목록 조회에 실패했습니다." }, { status: 500 });
  }
}
