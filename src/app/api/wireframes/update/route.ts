import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { errorResponse } from "@/lib/api/error-response";

export async function PATCH(request: NextRequest) {
  try {
    const { jobId, screenId, screenType } = await request.json();

    if (!jobId || !screenId || !screenType) {
      return NextResponse.json(
        { error: "jobId, screenId, screenType은 필수입니다." },
        { status: 400 }
      );
    }

    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
    });

    if (!job || !job.result) {
      return NextResponse.json(
        { error: "Job을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const result = JSON.parse(job.result);
    const screen = result.screens?.find(
      (s: { id: string }) => s.id === screenId
    );

    if (!screen) {
      return NextResponse.json(
        { error: "해당 화면을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    screen.screenType = screenType;

    await prisma.generationJob.update({
      where: { id: jobId },
      data: { result: JSON.stringify(result) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "화면 타입 수정에 실패했습니다.");
  }
}
