-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PLANNED', 'READY', 'IN_PROGRESS', 'PAUSED', 'DONE', 'CANCELED');

-- CreateEnum
CREATE TYPE "BatchPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "BatchType" AS ENUM ('TEMPLATE_RUN', 'MIXED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "BatchTaskStatus" AS ENUM ('TODO', 'DOING', 'DONE');

-- CreateEnum
CREATE TYPE "TodayQueueEntityType" AS ENUM ('BATCH', 'ORDER_ITEM');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "seasonId" TEXT;

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionBatch" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT,
    "name" TEXT NOT NULL,
    "batchType" "BatchType" NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'PLANNED',
    "priority" "BatchPriority" NOT NULL DEFAULT 'NORMAL',
    "targetDate" TIMESTAMP(3),
    "defaultMaterialId" TEXT,
    "defaultVariantId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchItemLink" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchItemLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchTask" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "BatchTaskStatus" NOT NULL DEFAULT 'TODO',
    "assignedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatchTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodayQueuePin" (
    "id" TEXT NOT NULL,
    "entityType" "TodayQueueEntityType" NOT NULL,
    "batchId" TEXT,
    "orderItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TodayQueuePin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateMaterialHint" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "avgAreaMm2PerItem" DOUBLE PRECISION,
    "avgSheetFractionPerItem" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateMaterialHint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductionBatch_status_targetDate_idx" ON "ProductionBatch"("status", "targetDate");

-- CreateIndex
CREATE INDEX "BatchItemLink_orderItemId_idx" ON "BatchItemLink"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "BatchItemLink_batchId_orderItemId_key" ON "BatchItemLink"("batchId", "orderItemId");

-- CreateIndex
CREATE INDEX "BatchTask_batchId_idx" ON "BatchTask"("batchId");

-- CreateIndex
CREATE INDEX "TodayQueuePin_entityType_createdAt_idx" ON "TodayQueuePin"("entityType", "createdAt");

-- CreateIndex
CREATE INDEX "TemplateMaterialHint_templateId_idx" ON "TemplateMaterialHint"("templateId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_defaultMaterialId_fkey" FOREIGN KEY ("defaultMaterialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_defaultVariantId_fkey" FOREIGN KEY ("defaultVariantId") REFERENCES "TemplateVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchItemLink" ADD CONSTRAINT "BatchItemLink_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductionBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchItemLink" ADD CONSTRAINT "BatchItemLink_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchTask" ADD CONSTRAINT "BatchTask_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductionBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchTask" ADD CONSTRAINT "BatchTask_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodayQueuePin" ADD CONSTRAINT "TodayQueuePin_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductionBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodayQueuePin" ADD CONSTRAINT "TodayQueuePin_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateMaterialHint" ADD CONSTRAINT "TemplateMaterialHint_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProductTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
