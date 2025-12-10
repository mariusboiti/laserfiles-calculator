-- CreateEnum
CREATE TYPE "ExternalSyncStatus" AS ENUM ('SUCCESS', 'FAILED');

-- AlterEnum
ALTER TYPE "ExternalOrderProcessedState" ADD VALUE 'IGNORED';

-- CreateTable
CREATE TABLE "ExternalSyncLog" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalOrderId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" "ExternalSyncStatus" NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalSyncLog_connectionId_createdAt_idx" ON "ExternalSyncLog"("connectionId", "createdAt");

-- CreateIndex
CREATE INDEX "ExternalSyncLog_externalOrderId_createdAt_idx" ON "ExternalSyncLog"("externalOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "ExternalOrder_processedState_idx" ON "ExternalOrder"("processedState");

-- AddForeignKey
ALTER TABLE "ExternalSyncLog" ADD CONSTRAINT "ExternalSyncLog_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "StoreConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalSyncLog" ADD CONSTRAINT "ExternalSyncLog_externalOrderId_fkey" FOREIGN KEY ("externalOrderId") REFERENCES "ExternalOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
