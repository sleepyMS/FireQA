import { prisma } from "@/lib/db";
import { UserRole } from "@/types/enums";
import { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { deriveOrgSlug } from "@/lib/slug";

export { SLUG_REGEX, deriveOrgSlug } from "@/lib/slug";

/** 이름 → URL slug 변환 (서버용, 빈 결과 시 "team" fallback) */
export function generateOrgSlug(name: string): string {
  return deriveOrgSlug(name) || "team";
}

const MAX_SLUG_ATTEMPTS = 20;

/** DB에서 slug 중복을 확인하고 고유한 값을 반환한다. DB 쿼리를 수행하므로 트랜잭션 외부에서만 호출할 것. */
export async function generateUniqueOrgSlug(name: string): Promise<string> {
  // suffix "-20"(3자)를 고려해 base를 45자로 제한
  const base = generateOrgSlug(name).slice(0, 45).replace(/-+$/, "");
  let slug = base;
  let suffix = 2;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    if (suffix > MAX_SLUG_ATTEMPTS) {
      throw new Error(`slug 생성 실패: 충돌 상한 초과 (base="${base}")`);
    }
    slug = `${base}-${suffix}`;
    suffix++;
  }
  return slug;
}

export async function provisionUserAndOrg(params: {
  supabaseId: string;
  email: string;
  name?: string;
  orgName?: string;
  /** 사전에 유효성·중복 검사를 마친 슬러그. 지정 시 자동 생성 로직을 건너뛴다. */
  slug?: string;
}) {
  const { supabaseId, email, name, orgName, slug: providedSlug } = params;

  if (!supabaseId || !email) throw new Error("supabaseId와 email은 필수입니다.");

  const existing = await prisma.user.findUnique({ where: { supabaseId } });
  if (existing) return existing;

  const displayName = name || email.split("@")[0];
  const orgDisplayName = orgName || `${displayName}의 팀`;

  // 호출자가 슬러그를 이미 확보한 경우: 재시도 없이 바로 트랜잭션 실행
  if (providedSlug) {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const organization = await tx.organization.create({
        data: { name: orgDisplayName, slug: providedSlug },
      });
      const user = await tx.user.create({
        data: {
          supabaseId,
          email,
          name: displayName,
          activeOrganizationId: organization.id,
        },
      });
      await tx.organizationMembership.create({
        data: { userId: user.id, organizationId: organization.id, role: UserRole.OWNER },
      });
      return user;
    });
  }

  // slug 확보 후 트랜잭션 실행. 동시 가입 시 P2002가 발생하면 새 slug로 재시도.
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = await generateUniqueOrgSlug(orgDisplayName);
    try {
      return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const organization = await tx.organization.create({
          data: { name: orgDisplayName, slug },
        });

        const user = await tx.user.create({
          data: {
            supabaseId,
            email,
            name: displayName,
            activeOrganizationId: organization.id,
          },
        });

        await tx.organizationMembership.create({
          data: {
            userId: user.id,
            organizationId: organization.id,
            role: UserRole.OWNER,
          },
        });

        return user;
      });
    } catch (e: unknown) {
      if (
        e instanceof PrismaClientKnownRequestError &&
        e.code === "P2002" &&
        (e.meta?.target as string[] | undefined)?.includes("slug") &&
        attempt < 2
      ) {
        continue;
      }
      throw e;
    }
  }
  throw new Error("조직 생성 실패: slug 충돌 재시도 초과");
}
