-- AlterTable
ALTER TABLE "QATemplate" ADD COLUMN     "promptMode" TEXT NOT NULL DEFAULT 'append',
ADD COLUMN     "systemPromptOverride" TEXT;
