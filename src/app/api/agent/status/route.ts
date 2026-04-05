import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";

// GET — 에이전트 온라인 상태 (사이드바 표시등용 경량 API)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ onlineCount: 0 });
    }

    const onlineCount = await prisma.agentConnection.count({
      where: {
        organizationId: user.organizationId,
        status: "online",
      },
    });

    return NextResponse.json({ onlineCount });
  } catch {
    return NextResponse.json({ onlineCount: 0 });
  }
}
