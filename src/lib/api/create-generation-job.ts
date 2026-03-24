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
  projectName: string,
  jobType: JobType,
  auth: { userId: string; organizationId: string }
): Promise<CreateJobResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await parseDocument(buffer, file.name, file.type);
  // PostgreSQL은 text 필드에 null 바이트(\0)를 허용하지 않음
  parsed.text = parsed.text.replace(/\0/g, "");

  const project = await prisma.project.create({
    data: {
      name: projectName,
      organizationId: auth.organizationId,
      createdById: auth.userId,
    },
  });

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

export async function completeJob(jobId: string, result: unknown, tokenUsage: number) {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      status: JobStatus.COMPLETED,
      result: JSON.stringify(result),
      tokenUsage,
    },
  });
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
