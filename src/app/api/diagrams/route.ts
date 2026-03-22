import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/db";
import { parseDocument } from "@/lib/parsers";
import { generateDiagrams } from "@/lib/openai/generate";

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

    // 1. Parse document
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseDocument(buffer, file.name, file.type);

    // 2. Save file to disk
    const uploadDir = join(process.cwd(), "uploads");
    await mkdir(uploadDir, { recursive: true });
    const filePath = join(uploadDir, `${Date.now()}_${file.name}`);
    await writeFile(filePath, buffer);

    // 3. Create project & upload in DB
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

    // 4. Create job
    const job = await prisma.generationJob.create({
      data: {
        projectId: project.id,
        uploadId: upload.id,
        type: "diagrams",
        status: "processing",
      },
    });

    // 5. Generate diagrams
    try {
      const { result, tokenUsage } = await generateDiagrams(parsed.text);

      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: "completed",
          result: JSON.stringify(result),
          tokenUsage,
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
    console.error("다이어그램 생성 오류:", error);
    return NextResponse.json(
      { error: "다이어그램 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
