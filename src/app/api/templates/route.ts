import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/templates - 템플릿 목록
export async function GET() {
  try {
    const templates = await prisma.qATemplate.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("템플릿 조회 오류:", error);
    return NextResponse.json(
      { error: "템플릿 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/templates - 템플릿 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, sheets, columns, constraints, requirements } = body;

    if (!name || !sheets || sheets.length === 0) {
      return NextResponse.json(
        { error: "이름과 시트 설정은 필수입니다." },
        { status: 400 }
      );
    }

    const template = await prisma.qATemplate.create({
      data: {
        name,
        description: description || null,
        sheetConfig: JSON.stringify(sheets),
        columnConfig: JSON.stringify(columns || []),
        constraints: constraints || "",
        requirements: requirements || "",
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error("템플릿 생성 오류:", error);
    return NextResponse.json(
      { error: "템플릿 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/templates - 템플릿 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    await prisma.qATemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("템플릿 삭제 오류:", error);
    return NextResponse.json(
      { error: "템플릿 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
