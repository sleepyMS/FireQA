import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "api/templates" });

// GET /api/templates - 템플릿 목록
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const templates = await prisma.qATemplate.findMany({
      where: {
        OR: [
          { organizationId: user.organizationId },
          { isDefault: true },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ templates });
  } catch (error) {
    logger.error("템플릿 조회 오류", { error });
    return NextResponse.json(
      { error: "템플릿 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/templates - 템플릿 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, sheets, columns, constraints, requirements, systemPromptOverride, promptMode } = body;

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
        organizationId: user.organizationId,
        sheetConfig: JSON.stringify(sheets),
        columnConfig: JSON.stringify(columns || []),
        constraints: constraints || "",
        requirements: requirements || "",
        systemPromptOverride: systemPromptOverride?.trim() || null,
        promptMode: promptMode === "replace" ? "replace" : "append",
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    logger.error("템플릿 생성 오류", { error });
    return NextResponse.json(
      { error: "템플릿 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/templates - 템플릿 삭제
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await request.json();

    const template = await prisma.qATemplate.findUnique({ where: { id } });
    if (!template || template.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "템플릿을 찾을 수 없습니다." }, { status: 404 });
    }

    await prisma.qATemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("템플릿 삭제 오류", { error });
    return NextResponse.json(
      { error: "템플릿 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
