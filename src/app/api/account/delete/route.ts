import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/db";
import { getCurrentUser, invalidateCachedUser } from "@/lib/auth/get-current-user";
import { UserRole } from "@/types/enums";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "api/account/delete" });

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 단독 소유자인 조직은 함께 삭제, 다른 소유자가 있으면 멤버십만 제거
    const ownerships = await prisma.organizationMembership.findMany({
      where: { userId: user.userId, role: UserRole.OWNER },
      select: { organizationId: true },
    });

    for (const { organizationId } of ownerships) {
      const ownerCount = await prisma.organizationMembership.count({
        where: { organizationId, role: UserRole.OWNER },
      });
      if (ownerCount <= 1) {
        // 나밖에 없는 조직 → 조직 자체 삭제 (cascade)
        await prisma.organization.delete({ where: { id: organizationId } });
      }
    }

    // supabaseId 조회 (Supabase Auth 삭제에 필요)
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { supabaseId: true },
    });

    // Prisma에서 유저 삭제 (cascade로 멤버십, 토큰, 에이전트 연결 등 일괄 삭제)
    await prisma.user.delete({ where: { id: user.userId } });
    invalidateCachedUser(user.userId);

    // Supabase Auth에서도 삭제
    if (dbUser?.supabaseId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const { error } = await supabaseAdmin.auth.admin.deleteUser(dbUser.supabaseId);
      if (error) {
        logger.warn("Supabase Auth 유저 삭제 실패", { error: error.message });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("회원탈퇴 오류", { error });
    return NextResponse.json({ error: "회원탈퇴에 실패했습니다." }, { status: 500 });
  }
}
