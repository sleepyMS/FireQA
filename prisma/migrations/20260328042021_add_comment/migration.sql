-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "jobId" TEXT,
    "targetItemId" TEXT,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comment_jobId_createdAt_idx" ON "Comment"("jobId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Comment_organizationId_createdAt_idx" ON "Comment"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
