import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { generateOrgSlug } from "@/lib/auth/provision-user";
import { UserRole } from "@/types/enums";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { name } = await request.json() as { name?: string };
    if (!name?.trim()) {
      return NextResponse.json({ error: "팀 이름은 필수입니다." }, { status: 400 });
    }

    const slug = generateOrgSlug(user.email);

    const org = await prisma.$transaction(async (tx) => {
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
