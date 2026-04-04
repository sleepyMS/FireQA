import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getAnalyticsData } from "@/lib/analytics/get-analytics-data";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "api/analytics" });

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    const data = await getAnalyticsData(user.organizationId);
    return NextResponse.json(data);
  } catch (error) {
    logger.error("분석 데이터 조회 오류", { error });
    return NextResponse.json({ error: "분석 데이터 조회에 실패했습니다." }, { status: 500 });
  }
}
