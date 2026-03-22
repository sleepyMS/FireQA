import { NextRequest, NextResponse } from "next/server";
import { createGenerationJob, completeJob, failJob } from "@/lib/api/create-generation-job";
import { errorResponse } from "@/lib/api/error-response";
import { generateDiagrams } from "@/lib/openai/generate";
import { JobType } from "@/types/enums";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const projectName = formData.get("projectName") as string;

    if (!file || !projectName) {
      return NextResponse.json(
        { error: "파일과 프로젝트 이름이 필요합니다." },
        { status: 400 }
      );
    }

    const { jobId, parsedText } = await createGenerationJob(
      file,
      projectName,
      JobType.DIAGRAMS
    );

    try {
      const { result, tokenUsage } = await generateDiagrams(parsedText);
      await completeJob(jobId, result, tokenUsage);
    } catch (genError) {
      await failJob(jobId, genError);
    }

    return NextResponse.json({ jobId });
  } catch (error) {
    return errorResponse(error, "다이어그램 생성에 실패했습니다.");
  }
}
