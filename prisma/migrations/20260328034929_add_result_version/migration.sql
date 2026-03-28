-- AlterTable
ALTER TABLE "DiagramVersion" ADD COLUMN     "createdById" TEXT;

-- CreateTable
CREATE TABLE "ResultVersion" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "resultJson" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "changeSummary" TEXT,
    "instruction" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResultVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResultVersion_jobId_isActive_idx" ON "ResultVersion"("jobId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ResultVersion_jobId_version_key" ON "ResultVersion"("jobId", "version");

-- AddForeignKey
ALTER TABLE "DiagramVersion" ADD CONSTRAINT "DiagramVersion_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagramVersion" ADD CONSTRAINT "DiagramVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultVersion" ADD CONSTRAINT "ResultVersion_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultVersion" ADD CONSTRAINT "ResultVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
