import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { DeviceAuthStatus } from "@/types/enums";
import { randomBytes, createHash } from "crypto";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "code 파라미터가 필요합니다." },
      { status: 400 }
    );
  }

  const deviceAuth = await prisma.deviceAuth.findUnique({
    where: { deviceCode: code },
  });

  if (!deviceAuth || deviceAuth.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "만료되었거나 유효하지 않은 코드입니다." },
      { status: 404 }
    );
  }

  if (deviceAuth.status === DeviceAuthStatus.PENDING) {
    return NextResponse.json({ status: DeviceAuthStatus.PENDING }, { status: 202 });
  }

  if (deviceAuth.status === DeviceAuthStatus.APPROVED && deviceAuth.token) {
    const token = deviceAuth.token;
    await prisma.deviceAuth.delete({ where: { id: deviceAuth.id } });
    return NextResponse.json({ status: DeviceAuthStatus.APPROVED, token });
  }

  return NextResponse.json(
    { error: "알 수 없는 상태입니다." },
    { status: 500 }
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, code } = body;

  if (action === "create") {
    const deviceCode = randomBytes(32).toString("hex");

    await prisma.deviceAuth.create({
      data: {
        deviceCode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // 만료된 레코드 정리 (fire-and-forget)
    prisma.deviceAuth
      .deleteMany({ where: { expiresAt: { lt: new Date() } } })
      .catch(() => {});

    return NextResponse.json({ deviceCode });
  }

  if (action === "approve") {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const deviceAuth = await prisma.deviceAuth.findUnique({
      where: { deviceCode: code },
    });

    if (
      !deviceAuth ||
      deviceAuth.expiresAt < new Date() ||
      deviceAuth.status !== DeviceAuthStatus.PENDING
    ) {
      return NextResponse.json(
        { error: "유효하지 않거나 만료된 코드입니다." },
        { status: 404 }
      );
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    // 토큰 생성 + DeviceAuth 승인을 병렬 실행
    await Promise.all([
      prisma.apiToken.create({
        data: { userId: user.userId, name: "Figma Plugin", tokenHash },
      }),
      prisma.deviceAuth.update({
        where: { id: deviceAuth.id },
        data: {
          status: DeviceAuthStatus.APPROVED,
          userId: user.userId,
          token: rawToken,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json(
    { error: "유효하지 않은 action입니다." },
    { status: 400 }
  );
}
