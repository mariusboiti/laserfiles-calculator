-- CreateEnum
CREATE TYPE "OffcutShapeType" AS ENUM ('RECTANGLE', 'IRREGULAR');

-- CreateEnum
CREATE TYPE "OffcutCondition" AS ENUM ('GOOD', 'OK', 'DAMAGED');

-- CreateEnum
CREATE TYPE "OffcutStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'USED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "OffcutSource" AS ENUM ('MANUAL', 'FROM_ORDER_ITEM', 'FROM_BATCH');

-- CreateEnum
CREATE TYPE "OffcutUsageType" AS ENUM ('FULL', 'PARTIAL');

-- CreateTable
CREATE TABLE "OffcutTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OffcutTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offcut" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "thicknessMm" INTEGER NOT NULL,
    "shapeType" "OffcutShapeType" NOT NULL,
    "widthMm" INTEGER,
    "heightMm" INTEGER,
    "boundingBoxWidthMm" INTEGER,
    "boundingBoxHeightMm" INTEGER,
    "estimatedAreaMm2" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "locationLabel" TEXT,
    "condition" "OffcutCondition" NOT NULL DEFAULT 'GOOD',
    "status" "OffcutStatus" NOT NULL DEFAULT 'AVAILABLE',
    "source" "OffcutSource" NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Offcut_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffcutTagsLink" (
    "offcutId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "OffcutTagsLink_pkey" PRIMARY KEY ("offcutId","tagId")
);

-- CreateTable
CREATE TABLE "OffcutUsage" (
    "id" TEXT NOT NULL,
    "offcutId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "batchId" TEXT,
    "usedAreaMm2" INTEGER,
    "usedWidthMm" INTEGER,
    "usedHeightMm" INTEGER,
    "usageType" "OffcutUsageType" NOT NULL,
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OffcutUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffcutReservation" (
    "id" TEXT NOT NULL,
    "offcutId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "batchId" TEXT,
    "reservedByUserId" TEXT NOT NULL,
    "reservedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OffcutReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Offcut_materialId_thicknessMm_status_idx" ON "Offcut"("materialId", "thicknessMm", "status");

-- CreateIndex
CREATE INDEX "Offcut_status_idx" ON "Offcut"("status");

-- CreateIndex
CREATE INDEX "Offcut_locationLabel_idx" ON "Offcut"("locationLabel");

-- CreateIndex
CREATE INDEX "OffcutUsage_offcutId_idx" ON "OffcutUsage"("offcutId");

-- CreateIndex
CREATE INDEX "OffcutUsage_orderItemId_idx" ON "OffcutUsage"("orderItemId");

-- CreateIndex
CREATE INDEX "OffcutUsage_batchId_idx" ON "OffcutUsage"("batchId");

-- CreateIndex
CREATE INDEX "OffcutReservation_offcutId_idx" ON "OffcutReservation"("offcutId");

-- CreateIndex
CREATE INDEX "OffcutReservation_orderItemId_idx" ON "OffcutReservation"("orderItemId");

-- CreateIndex
CREATE INDEX "OffcutReservation_batchId_idx" ON "OffcutReservation"("batchId");

-- AddForeignKey
ALTER TABLE "Offcut" ADD CONSTRAINT "Offcut_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offcut" ADD CONSTRAINT "Offcut_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffcutTagsLink" ADD CONSTRAINT "OffcutTagsLink_offcutId_fkey" FOREIGN KEY ("offcutId") REFERENCES "Offcut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffcutTagsLink" ADD CONSTRAINT "OffcutTagsLink_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "OffcutTag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffcutUsage" ADD CONSTRAINT "OffcutUsage_offcutId_fkey" FOREIGN KEY ("offcutId") REFERENCES "Offcut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffcutUsage" ADD CONSTRAINT "OffcutUsage_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffcutUsage" ADD CONSTRAINT "OffcutUsage_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductionBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffcutUsage" ADD CONSTRAINT "OffcutUsage_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffcutReservation" ADD CONSTRAINT "OffcutReservation_offcutId_fkey" FOREIGN KEY ("offcutId") REFERENCES "Offcut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffcutReservation" ADD CONSTRAINT "OffcutReservation_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffcutReservation" ADD CONSTRAINT "OffcutReservation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductionBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffcutReservation" ADD CONSTRAINT "OffcutReservation_reservedByUserId_fkey" FOREIGN KEY ("reservedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
