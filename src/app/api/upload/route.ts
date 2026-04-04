import { NextRequest, NextResponse } from "next/server";
import { parseDocument } from "@/lib/parsers";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrgPlan } from "@/lib/billing/get-org-plan";
import { getPlanLimits } from "@/lib/billing/plan-limits";
import { PLAN_LABEL } from "@/types/enums";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "api/upload" });

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    const plan = await getOrgPlan(user.organizationId);
    const limits = getPlanLimits(plan);
    const fileSizeMb = file.size / (1024 * 1024);
    if (fileSizeMb > limits.uploadsMaxMb) {
      return NextResponse.json(
        { error: `파일 크기(${fileSizeMb.toFixed(1)}MB)가 ${PLAN_LABEL[plan] ?? plan} 플랜의 한도(${limits.uploadsMaxMb}MB)를 초과합니다.` },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseDocument(buffer, file.name, file.type);

    return NextResponse.json({
      parsedText: parsed.text,
      metadata: parsed.metadata,
    });
  } catch (error) {
    logger.error("업로드 오류", { error });
    return NextResponse.json(
      { error: "파일 파싱에 실패했습니다." },
      { status: 500 }
    );
  }
}
