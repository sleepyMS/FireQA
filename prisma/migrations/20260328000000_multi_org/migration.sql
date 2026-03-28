-- OrganizationMembership 테이블 생성
CREATE TABLE "OrganizationMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- User에 activeOrganizationId 추가
ALTER TABLE "User" ADD COLUMN "activeOrganizationId" TEXT;

-- 기존 User(organizationId, role) → OrganizationMembership으로 데이터 이전
INSERT INTO "OrganizationMembership" ("id", "userId", "organizationId", "role", "joinedAt")
SELECT gen_random_uuid()::text, u."id", u."organizationId", u."role", u."createdAt"
FROM "User" u;

-- activeOrganizationId 초기화
UPDATE "User" SET "activeOrganizationId" = "organizationId";

-- 인덱스 및 제약조건
CREATE UNIQUE INDEX "OrganizationMembership_userId_organizationId_key"
    ON "OrganizationMembership"("userId", "organizationId");
CREATE INDEX "OrganizationMembership_userId_idx" ON "OrganizationMembership"("userId");
CREATE INDEX "OrganizationMembership_organizationId_idx" ON "OrganizationMembership"("organizationId");

ALTER TABLE "OrganizationMembership"
    ADD CONSTRAINT "OrganizationMembership_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMembership"
    ADD CONSTRAINT "OrganizationMembership_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "User"
    ADD CONSTRAINT "User_activeOrganizationId_fkey"
    FOREIGN KEY ("activeOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 기존 컬럼 제거
DROP INDEX IF EXISTS "User_organizationId_idx";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_organizationId_fkey";
ALTER TABLE "User" DROP COLUMN "organizationId";
ALTER TABLE "User" DROP COLUMN "role";
