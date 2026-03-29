import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { provisionUserAndOrg, generateUniqueOrgSlug } from "@/lib/auth/provision-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UserRole } from "@/types/enums";

export async function POST(request: NextRequest) {
  try {
    // supabaseId/email은 클라이언트 바디 대신 검증된 세션에서 추출
    const supabase = await createSupabaseServerClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();

    if (!supabaseUser) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { name, orgName, orgSlug } = await request.json();

    if (!orgName) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 슬러그 결정과 유저 조회를 병렬 실행
    const existingUserPromise = prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
      select: { id: true },
    });

    let finalSlug: string;
    if (orgSlug) {
      const taken = await prisma.organization.findUnique({ where: { slug: orgSlug } });
      if (taken) {
        return NextResponse.json({ error: "이미 사용 중인 슬러그입니다." }, { status: 409 });
      }
      finalSlug = orgSlug;
    } else {
      finalSlug = await generateUniqueOrgSlug(orgName.trim());
    }

    const existingUser = await existingUserPromise;

    if (existingUser) {
      // 기존 유저: 새 조직만 생성 (provisionUserAndOrg은 기존 유저면 조직을 만들지 않음)
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const org = await tx.organization.create({
          data: { name: orgName.trim(), slug: finalSlug },
        });
        await tx.organizationMembership.create({
          data: { userId: existingUser.id, organizationId: org.id, role: UserRole.OWNER },
        });
        await tx.user.update({
          where: { id: existingUser.id },
          data: { activeOrganizationId: org.id },
        });
      });
    } else {
      // 신규 유저: 유저 + 조직 함께 생성
      await provisionUserAndOrg({
        supabaseId: supabaseUser.id,
        email: supabaseUser.email ?? "",
        name,
        orgName,
        slug: finalSlug,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("회원가입 오류:", error);
    return NextResponse.json(
      { error: "회원가입에 실패했습니다." },
      { status: 500 }
    );
  }
}
