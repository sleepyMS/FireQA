import { NextRequest, NextResponse } from "next/server";
import { createGenerationJob, completeJob, failJob } from "@/lib/api/create-generation-job";
import { errorResponse } from "@/lib/api/error-response";
import { callOpenAIWithSchema } from "@/lib/openai/call-with-schema";
import { wireframeJsonSchema } from "@/lib/openai/schemas/wireframe";
import {
  WIREFRAME_SYSTEM_PROMPT,
  buildWireframeUserPrompt,
} from "@/lib/openai/prompts/wireframe-system";
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
      JobType.WIREFRAMES
    );

    try {
      let input = parsedText;
      if (input.length > 60000) input = input.slice(0, 60000);

      const { result, tokenUsage } = await callOpenAIWithSchema(
        WIREFRAME_SYSTEM_PROMPT,
        buildWireframeUserPrompt(input),
        wireframeJsonSchema
      );
      await completeJob(jobId, result, tokenUsage);
    } catch (genError) {
      await failJob(jobId, genError);
    }

    return NextResponse.json({ jobId });
  } catch (error) {
    return errorResponse(error, "와이어프레임 생성에 실패했습니다.");
  }
}
