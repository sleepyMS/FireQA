import { prisma } from "@/lib/db";
import { parseDocument } from "@/lib/parsers";
import type { JobType } from "@/types/enums";
import { JobStatus } from "@/types/enums";

interface CreateJobResult {
  jobId: string;
  parsedText: string;
  projectId: string;
  uploadId: string;
}

export async function createGenerationJob(
  file: File,
  // string이면 새 프로젝트 생성, { id } 객체면 기존 프로젝트 재사용
  projectInput: string | { id: string },
  jobType: JobType,
  auth: { userId: string; organizationId: string }
): Promise<CreateJobResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await parseDocument(buffer, file.name, file.type);
  // PostgreSQL은 text 필드에 null 바이트(\0)를 허용하지 않음
  parsed.text = parsed.text.replace(/\0/g, "");

  let project: { id: string; name: string };
  if (typeof projectInput === "string") {
    // projectName이 전달된 경우 → 새 프로젝트 생성 (기존 동작 유지)
    project = await prisma.project.create({
      data: {
        name: projectInput,
        organizationId: auth.organizationId,
        createdById: auth.userId,
      },
    });
  } else {
    // projectId가 전달된 경우 → 기존 프로젝트 재사용 (소속 조직 검증 포함)
    const existing = await prisma.project.findFirst({
      where: { id: projectInput.id, organizationId: auth.organizationId },
    });
    if (!existing) throw new Error("프로젝트를 찾을 수 없습니다.");
    if (existing.status === "deleted") throw new Error("삭제된 프로젝트에는 생성할 수 없습니다.");
    project = existing;
  }

  const upload = await prisma.upload.create({
    data: {
      projectId: project.id,
      organizationId: auth.organizationId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      storagePath: "",
      parsedText: parsed.text,
    },
  });

  const job = await prisma.generationJob.create({
    data: {
      projectId: project.id,
      uploadId: upload.id,
      userId: auth.userId,
      type: jobType,
      status: JobStatus.PROCESSING,
    },
  });

  return {
    jobId: job.id,
    parsedText: parsed.text,
    projectId: project.id,
    uploadId: upload.id,
  };
}

export async function completeJob(
  jobId: string,
  result: unknown,
  tokenUsage: number,
  createdById?: string
) {
  const resultJson = JSON.stringify(result);

  await prisma.$transaction([
    prisma.generationJob.update({
      where: { id: jobId },
      data: { status: JobStatus.COMPLETED, result: resultJson, tokenUsage },
    }),
    prisma.resultVersion.create({
      data: {
        jobId,
        version: 1,
        resultJson,
        changeType: "initial",
        isActive: true,
        createdById: createdById ?? null,
      },
    }),
  ]);
}

export async function failJob(jobId: string, error: unknown) {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      status: JobStatus.FAILED,
      error: error instanceof Error ? error.message : "알 수 없는 오류",
    },
  });
}
