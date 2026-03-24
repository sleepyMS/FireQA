-- CreateTable: Organization (먼저 생성해야 기존 데이터에 FK 할당 가능)
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable: User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "supabaseId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ApiToken
CREATE TABLE "ApiToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Figma Plugin',
    "tokenHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DeviceAuth
CREATE TABLE "DeviceAuth" (
    "id" TEXT NOT NULL,
    "deviceCode" TEXT NOT NULL,
    "userId" TEXT,
    "token" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceAuth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "User_supabaseId_key" ON "User"("supabaseId");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_supabaseId_idx" ON "User"("supabaseId");
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");
CREATE UNIQUE INDEX "ApiToken_tokenHash_key" ON "ApiToken"("tokenHash");
CREATE INDEX "ApiToken_tokenHash_idx" ON "ApiToken"("tokenHash");
CREATE UNIQUE INDEX "DeviceAuth_deviceCode_key" ON "DeviceAuth"("deviceCode");
CREATE INDEX "DeviceAuth_deviceCode_idx" ON "DeviceAuth"("deviceCode");

-- FK: User, ApiToken
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ▼ 기존 데이터 마이그레이션: legacy Organization 생성 후 기존 행에 할당 ▼

-- 1) legacy Organization 생성
INSERT INTO "Organization" ("id", "name", "slug", "plan", "createdAt", "updatedAt")
VALUES ('legacy-org', 'Legacy Organization', 'legacy', 'free', NOW(), NOW());

-- 2) Project: organizationId 컬럼 추가 (nullable로 먼저) → 기존 데이터 할당 → NOT NULL로 변경
ALTER TABLE "Project" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Project" ADD COLUMN "createdById" TEXT;
UPDATE "Project" SET "organizationId" = 'legacy-org' WHERE "organizationId" IS NULL;
ALTER TABLE "Project" ALTER COLUMN "organizationId" SET NOT NULL;

-- 3) Upload: organizationId 컬럼 추가 (nullable로 먼저) → 기존 데이터 할당 → NOT NULL로 변경
ALTER TABLE "Upload" ADD COLUMN "organizationId" TEXT;
UPDATE "Upload" SET "organizationId" = 'legacy-org' WHERE "organizationId" IS NULL;
ALTER TABLE "Upload" ALTER COLUMN "organizationId" SET NOT NULL;

-- 4) GenerationJob: userId 컬럼 추가 (nullable)
ALTER TABLE "GenerationJob" ADD COLUMN "userId" TEXT;

-- 5) QATemplate: organizationId 컬럼 추가 (nullable)
ALTER TABLE "QATemplate" ADD COLUMN "organizationId" TEXT;

-- CreateIndex
CREATE INDEX "GenerationJob_userId_idx" ON "GenerationJob"("userId");
CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");
CREATE INDEX "QATemplate_organizationId_idx" ON "QATemplate"("organizationId");
CREATE INDEX "Upload_organizationId_idx" ON "Upload"("organizationId");

-- FK: 비즈니스 모델
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QATemplate" ADD CONSTRAINT "QATemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
