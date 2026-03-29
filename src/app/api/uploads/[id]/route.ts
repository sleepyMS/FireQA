import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const { id } = await params;
  const download = request.nextUrl.searchParams.get("download") === "1";

  const upload = await prisma.upload.findFirst({
    where: { id, organizationId: user.organizationId },
    select: { fileName: true, parsedText: true },
  });

  if (!upload) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  if (!upload.parsedText) return NextResponse.json({ error: "저장된 텍스트가 없습니다." }, { status: 404 });

  if (download) {
    const baseName = upload.fileName.replace(/\.[^.]+$/, "");
    return new NextResponse(upload.parsedText, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(baseName + ".txt")}`,
      },
    });
  }

  return NextResponse.json({ fileName: upload.fileName, text: upload.parsedText });
}
