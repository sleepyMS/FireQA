-- CreateTable
CREATE TABLE "DiagramVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "diagramTitle" TEXT NOT NULL,
    "mermaidCode" TEXT NOT NULL,
    "instruction" TEXT,
    "version" INTEGER NOT NULL,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "DiagramVersion_jobId_diagramTitle_idx" ON "DiagramVersion"("jobId", "diagramTitle");
