import { NextRequest, NextResponse } from "next/server";
import { provisionUserAndOrg } from "@/lib/auth/provision-user";

export async function POST(request: NextRequest) {
  try {
    const { supabaseId, email, name, orgName } = await request.json();

    if (!supabaseId || !email || !orgName) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    await provisionUserAndOrg({ supabaseId, email, name, orgName });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("회원가입 오류:", error);
    return NextResponse.json(
      { error: "회원가입에 실패했습니다." },
      { status: 500 }
    );
  }
}
