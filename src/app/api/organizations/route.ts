import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { generateUniqueOrgSlug } from "@/lib/auth/provision-user";
import { UserRole } from "@/types/enums";

// 허용 형식: 소문자·숫자·하이픈, 1~48자, 시작/끝은 하이픈 불가
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,46}[a-z0-9]$|^[a-z0-9]$/;

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { name, slug: slugInput } = await request.json() as {
      name?: string;
      slug?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "팀 이름은 필수입니다." }, { status: 400 });
    }

    let slug: string;
    if (slugInput?.trim()) {
      const candidate = slugInput.trim().toLowerCase();
      if (!SLUG_REGEX.test(candidate)) {
        return NextResponse.json(
          { error: "슬러그는 소문자, 숫자, 하이픈만 사용할 수 있으며 1~48자여야 합니다." },
          { status: 400 }
        );
      }
      const existing = await prisma.organization.findUnique({ where: { slug: candidate } });
      if (existing) {
        return NextResponse.json({ error: "이미 사용 중인 슬러그입니다." }, { status: 409 });
      }
      slug = candidate;
    } else {
      slug = await generateUniqueOrgSlug(name.trim());
    }

    const org = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const organization = await tx.organization.create({
        data: { name: name.trim(), slug },
      });

      await tx.organizationMembership.create({
        data: {
          userId: user.userId,
          organizationId: organization.id,
          role: UserRole.OWNER,
        },
      });

      await tx.user.update({
        where: { id: user.userId },
        data: { activeOrganizationId: organization.id },
      });

      return organization;
    });

    return NextResponse.json({ id: org.id, name: org.name, slug: org.slug });
  } catch (error) {
    console.error("조직 생성 오류:", error);
    return NextResponse.json({ error: "조직 생성에 실패했습니다." }, { status: 500 });
  }
}
