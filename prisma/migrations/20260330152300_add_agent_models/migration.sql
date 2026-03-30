-- AlterTable
ALTER TABLE "ApiToken" ADD COLUMN     "keyPrefix" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "AgentConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'self_hosted',
    "status" TEXT NOT NULL DEFAULT 'offline',
    "lastHeartbeat" TIMESTAMP(3),
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTask" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "connectionId" TEXT,
    "createdById" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "prompt" TEXT NOT NULL,
    "context" TEXT NOT NULL DEFAULT '{}',
    "mcpTools" TEXT NOT NULL DEFAULT '[]',
    "sessionId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "timeoutMs" INTEGER NOT NULL DEFAULT 300000,
    "result" TEXT,
    "outputLog" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentConnection_organizationId_idx" ON "AgentConnection"("organizationId");

-- CreateIndex
CREATE INDEX "AgentConnection_organizationId_status_idx" ON "AgentConnection"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AgentTask_organizationId_status_idx" ON "AgentTask"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AgentTask_organizationId_createdAt_idx" ON "AgentTask"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AgentTask_connectionId_idx" ON "AgentTask"("connectionId");

-- CreateIndex
CREATE INDEX "GenerationJob_userId_createdAt_idx" ON "GenerationJob"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_userId_organizationId_createdAt_idx" ON "Notification"("userId", "organizationId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "AgentConnection" ADD CONSTRAINT "AgentConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentConnection" ADD CONSTRAINT "AgentConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "AgentConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
