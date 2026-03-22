import { NextRequest, NextResponse } from "next/server";
import { parseDocument } from "@/lib/parsers";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseDocument(buffer, file.name, file.type);

    return NextResponse.json({
      parsedText: parsed.text,
      metadata: parsed.metadata,
    });
  } catch (error) {
    console.error("업로드 오류:", error);
    return NextResponse.json(
      { error: "파일 파싱에 실패했습니다." },
      { status: 500 }
    );
  }
}
