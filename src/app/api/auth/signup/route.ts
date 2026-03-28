import { NextRequest, NextResponse } from "next/server";
import { provisionUserAndOrg } from "@/lib/auth/provision-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // supabaseId/email은 클라이언트 바디 대신 검증된 세션에서 추출
    const supabase = await createSupabaseServerClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();

    if (!supabaseUser) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { name, orgName } = await request.json();

    if (!orgName) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    await provisionUserAndOrg({
      supabaseId: supabaseUser.id,
      email: supabaseUser.email ?? "",
      name,
      orgName,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("회원가입 오류:", error);
    return NextResponse.json(
      { error: "회원가입에 실패했습니다." },
      { status: 500 }
    );
  }
}
