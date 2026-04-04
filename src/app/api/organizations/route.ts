import { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/db";
import { updateCachedNewOrg } from "@/lib/auth/get-current-user";
import { generateUniqueOrgSlug } from "@/lib/auth/provision-user";
import { UserRole } from "@/types/enums";
import {
  withApiHandler,
  ApiError,
  createOrganizationSchema,
  type CreateOrganizationBody,
} from "@/lib/api";

// 허용 형식: 소문자·숫자·하이픈, 1~48자, 시작/끝은 하이픈 불가
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,46}[a-z0-9]$|^[a-z0-9]$/;

// POST /api/organizations — 조직 생성
export const POST = withApiHandler<CreateOrganizationBody>(
  async ({ user, body }) => {
    const { name, slug: slugInput } = body;

    let slug: string;
    if (slugInput?.trim()) {
      const candidate = slugInput.trim().toLowerCase();
      if (!SLUG_REGEX.test(candidate)) {
        throw ApiError.validationError(
          "슬러그는 소문자, 숫자, 하이픈만 사용할 수 있으며 1~48자여야 합니다.",
        );
      }
      const existing = await prisma.organization.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (existing) {
        throw ApiError.conflict("슬러그");
      }
      slug = candidate;
    } else {
      slug = await generateUniqueOrgSlug(name.trim());
    }

    try {
      const org = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const organization = await tx.organization.create({
          data: { name: name.trim(), slug },
          select: { id: true, name: true, slug: true },
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

      // 새 조직을 캐시에 반영 (멤버십 추가 + activeOrganizationId 교체)
      updateCachedNewOrg(user.userId, org.id, UserRole.OWNER);

      return { id: org.id, name: org.name, slug: org.slug };
    } catch (error) {
      // 동시 요청으로 slug 충돌이 발생한 경우
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        (error.meta?.target as string[] | undefined)?.includes("slug")
      ) {
        throw ApiError.conflict("슬러그");
      }
      throw error;
    }
  },
  { bodySchema: createOrganizationSchema, successStatus: 201 },
);
