import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  withApiHandler,
  ApiError,
  getUploadSchema,
  type GetUploadQuery,
} from "@/lib/api";

// GET /api/uploads/[id] — 업로드 파일 텍스트 조회 또는 다운로드
export const GET = withApiHandler<unknown, GetUploadQuery>(
  async ({ user, query, params }) => {
    const { id } = params;
    const download = query.download === "1";

    const upload = await prisma.upload.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { fileName: true, parsedText: true },
    });

    if (!upload) {
      throw ApiError.notFound("파일");
    }
    if (!upload.parsedText) {
      throw ApiError.notFound("저장된 텍스트");
    }

    if (download) {
      const baseName = upload.fileName.replace(/\.[^.]+$/, "");
      return new NextResponse(upload.parsedText, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(baseName + ".txt")}`,
        },
      });
    }

    return { fileName: upload.fileName, text: upload.parsedText };
  },
  { querySchema: getUploadSchema },
);
