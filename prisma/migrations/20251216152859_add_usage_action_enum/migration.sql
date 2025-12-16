/*
  Warnings:

  - Added the required column `action` to the `UsageEvent` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UsageAction" AS ENUM ('EXPORT');

-- DropIndex
DROP INDEX "UsageEvent_userId_createdAt_idx";

-- DropIndex
DROP INDEX "UsageEvent_userId_toolKey_createdAt_idx";

-- AlterTable
ALTER TABLE "UsageEvent" ADD COLUMN     "action" "UsageAction" NOT NULL;

-- CreateIndex
CREATE INDEX "UsageEvent_userId_toolKey_action_createdAt_idx" ON "UsageEvent"("userId", "toolKey", "action", "createdAt");
