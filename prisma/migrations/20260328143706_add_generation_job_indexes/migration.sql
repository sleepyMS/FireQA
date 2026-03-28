-- CreateIndex
CREATE INDEX "GenerationJob_projectId_idx" ON "GenerationJob"("projectId");

-- CreateIndex
CREATE INDEX "GenerationJob_projectId_createdAt_idx" ON "GenerationJob"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GenerationJob_status_idx" ON "GenerationJob"("status");
