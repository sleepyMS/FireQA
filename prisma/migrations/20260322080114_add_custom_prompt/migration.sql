-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_QATemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sheetConfig" TEXT NOT NULL DEFAULT '[]',
    "columnConfig" TEXT NOT NULL DEFAULT '{}',
    "customPrompt" TEXT NOT NULL DEFAULT '',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_QATemplate" ("columnConfig", "createdAt", "description", "id", "isDefault", "name", "sheetConfig", "updatedAt") SELECT "columnConfig", "createdAt", "description", "id", "isDefault", "name", "sheetConfig", "updatedAt" FROM "QATemplate";
DROP TABLE "QATemplate";
ALTER TABLE "new_QATemplate" RENAME TO "QATemplate";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
