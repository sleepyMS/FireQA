import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;

    const apiKey = await prisma.apiToken.findUnique({ where: { id } });
    if (!apiKey || apiKey.userId !== user.userId) {
      return NextResponse.json({ error: "API Key를 찾을 수 없습니다." }, { status: 404 });
    }

    await prisma.apiToken.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API Key 삭제 오류:", error);
    return NextResponse.json({ error: "삭제에 실패했습니다." }, { status: 500 });
  }
}
