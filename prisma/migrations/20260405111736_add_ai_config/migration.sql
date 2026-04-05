-- CreateTable
CREATE TABLE "AIConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "executionMode" TEXT NOT NULL DEFAULT 'server',
    "serverModel" TEXT NOT NULL DEFAULT 'gpt-4.1-mini',
    "agentConnectionId" TEXT,
    "agentModel" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIConfig_organizationId_key" ON "AIConfig"("organizationId");

-- AddForeignKey
ALTER TABLE "AIConfig" ADD CONSTRAINT "AIConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConfig" ADD CONSTRAINT "AIConfig_agentConnectionId_fkey" FOREIGN KEY ("agentConnectionId") REFERENCES "AgentConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
