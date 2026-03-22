import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PATCH /api/diagrams/update - 특정 다이어그램의 mermaidCode를 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const { jobId, diagramTitle, mermaidCode } = await request.json();

    if (!jobId || !diagramTitle || !mermaidCode) {
      return NextResponse.json(
        { error: "jobId, diagramTitle, mermaidCode는 필수입니다." },
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
    const diagram = result.diagrams?.find(
      (d: { title: string }) => d.title === diagramTitle
    );

    if (!diagram) {
      return NextResponse.json(
        { error: "해당 다이어그램을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    diagram.mermaidCode = mermaidCode;

    await prisma.generationJob.update({
      where: { id: jobId },
      data: { result: JSON.stringify(result) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("다이어그램 업데이트 오류:", error);
    return NextResponse.json(
      { error: "업데이트에 실패했습니다." },
      { status: 500 }
    );
  }
}
