import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/db";
import { parseDocument } from "@/lib/parsers";
import OpenAI from "openai";
import { wireframeJsonSchema } from "@/lib/openai/schemas/wireframe";
import {
  WIREFRAME_SYSTEM_PROMPT,
  buildWireframeUserPrompt,
} from "@/lib/openai/prompts/wireframe-system";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

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

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseDocument(buffer, file.name, file.type);

    const uploadDir = join(process.cwd(), "uploads");
    await mkdir(uploadDir, { recursive: true });
    const filePath = join(uploadDir, `${Date.now()}_${file.name}`);
    await writeFile(filePath, buffer);

    const project = await prisma.project.create({
      data: { name: projectName },
    });

    const upload = await prisma.upload.create({
      data: {
        projectId: project.id,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        storagePath: filePath,
        parsedText: parsed.text,
      },
    });

    const job = await prisma.generationJob.create({
      data: {
        projectId: project.id,
        uploadId: upload.id,
        type: "wireframes",
        status: "processing",
      },
    });

    try {
      let input = parsed.text;
      if (input.length > 60000) input = input.slice(0, 60000);

      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: WIREFRAME_SYSTEM_PROMPT },
          { role: "user", content: buildWireframeUserPrompt(input) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: wireframeJsonSchema,
        },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("AI 응답이 비어있습니다.");

      const result = JSON.parse(content);

      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: "completed",
          result: JSON.stringify(result),
          tokenUsage: response.usage?.total_tokens ?? 0,
        },
      });
    } catch (genError) {
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          error:
            genError instanceof Error
              ? genError.message
              : "알 수 없는 오류",
        },
      });
    }

    return NextResponse.json({ jobId: job.id });
  } catch (error) {
    console.error("와이어프레임 생성 오류:", error);
    return NextResponse.json(
      { error: "와이어프레임 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
