/**
 * scripts/backfill-org-slugs.ts
 *
 * 기존 조직의 slug를 email 기반 형식에서 이름 기반 형식으로 마이그레이션한다.
 *
 * 실행 방법:
 *   npx tsx scripts/backfill-org-slugs.ts
 *
 * 안전 특성:
 *   - 이미 이름 기반 slug를 갖고 있는 조직은 건너뜀 (멱등성 보장)
 *   - 중복 slug는 -2, -3, ... 순으로 suffix 추가 (최대 20회 시도)
 */

import { prisma } from "../src/lib/db";

// provision-user.ts의 generateOrgSlug와 동일한 로직
function generateOrgSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 48)
      .replace(/^-+|-+$/g, "") || "team"
  );
}

const MAX_SLUG_ATTEMPTS = 20;

async function findUniqueSlug(
  base: string,
  excludeOrgId: string
): Promise<string> {
  // suffix "-20"(3자)를 고려해 base를 45자로 제한
  const trimmedBase = base.slice(0, 45).replace(/-+$/, "");
  let slug = trimmedBase;
  let suffix = 2;

  while (true) {
    const conflict = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });

    // slug가 없거나, 충돌하는 org가 자기 자신이면 사용 가능
    if (!conflict || conflict.id === excludeOrgId) {
      return slug;
    }

    if (suffix > MAX_SLUG_ATTEMPTS) {
      throw new Error(
        `slug 생성 실패: 충돌 상한 초과 (base="${trimmedBase}")`
      );
    }

    slug = `${trimmedBase}-${suffix}`;
    suffix++;
  }
}

async function main() {
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`총 ${orgs.length}개 조직을 처리합니다.\n`);

  let updated = 0;
  let skipped = 0;

  for (const org of orgs) {
    const candidateBase = generateOrgSlug(org.name);
    // 현재 slug가 이미 이름에서 파생된 base slug와 일치하는지 확인
    // (suffix가 붙은 -2, -3 형태도 허용)
    const isAlreadyNameBased =
      org.slug === candidateBase ||
      /^.+-\d+$/.test(org.slug) &&
        org.slug.replace(/-\d+$/, "") === candidateBase.slice(0, 45).replace(/-+$/, "");

    if (isAlreadyNameBased) {
      skipped++;
      continue;
    }

    const newSlug = await findUniqueSlug(candidateBase, org.id);

    await prisma.organization.update({
      where: { id: org.id },
      data: { slug: newSlug },
    });

    console.log(`Updated org ${org.id}: "${org.name}" → "${newSlug}"`);
    updated++;
  }

  console.log(`\n=== 완료 ===`);
  console.log(`처리한 조직 수: ${orgs.length}`);
  console.log(`업데이트됨:     ${updated}`);
  console.log(`건너뜀 (이미 정상): ${skipped}`);
}

main()
  .catch((err) => {
    console.error("오류 발생:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
