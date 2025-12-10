-- CreateEnum
CREATE TYPE "SalesChannel" AS ENUM ('WOOCOMMERCE', 'ETSY', 'CSV');

-- CreateEnum
CREATE TYPE "StoreConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "ExternalOrderProcessedState" AS ENUM ('NEW', 'MAPPED', 'CREATED_INTERNAL', 'NEEDS_REVIEW', 'ERROR');

-- CreateEnum
CREATE TYPE "ExternalProductPricingMode" AS ENUM ('USE_TEMPLATE_RULES', 'EXTERNAL_PRICE_IGNORE', 'PRICE_OVERRIDE');

-- CreateTable
CREATE TABLE "StoreConnection" (
    "id" TEXT NOT NULL,
    "channel" "SalesChannel" NOT NULL,
    "name" TEXT NOT NULL,
    "status" "StoreConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "credentialsJson" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "settingsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalProductMapping" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalProductId" TEXT NOT NULL,
    "externalProductName" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "variantId" TEXT,
    "materialId" TEXT,
    "templateProductId" TEXT,
    "personalizationMappingJson" JSONB,
    "pricingMode" "ExternalProductPricingMode" NOT NULL DEFAULT 'USE_TEMPLATE_RULES',
    "priceOverride" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalProductMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalOrder" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalOrderId" TEXT NOT NULL,
    "externalOrderNumber" TEXT NOT NULL,
    "externalStatus" TEXT,
    "currency" TEXT,
    "totalsJson" JSONB,
    "customerSnapshotJson" JSONB,
    "rawPayloadJson" JSONB,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedState" "ExternalOrderProcessedState" NOT NULL DEFAULT 'NEW',
    "errorMessage" TEXT,

    CONSTRAINT "ExternalOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalOrderItem" (
    "id" TEXT NOT NULL,
    "externalOrderId" TEXT NOT NULL,
    "externalProductId" TEXT,
    "title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2),
    "optionsJson" JSONB,
    "rawPayloadJson" JSONB,

    CONSTRAINT "ExternalOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalOrderExternalLink" (
    "id" TEXT NOT NULL,
    "internalOrderId" TEXT NOT NULL,
    "externalOrderId" TEXT NOT NULL,
    "channel" "SalesChannel" NOT NULL,
    "connectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalOrderExternalLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreConnection_channel_idx" ON "StoreConnection"("channel");

-- CreateIndex
CREATE INDEX "ExternalProductMapping_connectionId_idx" ON "ExternalProductMapping"("connectionId");

-- CreateIndex
CREATE INDEX "ExternalProductMapping_templateId_idx" ON "ExternalProductMapping"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalProductMapping_connectionId_externalProductId_key" ON "ExternalProductMapping"("connectionId", "externalProductId");

-- CreateIndex
CREATE INDEX "ExternalOrder_connectionId_idx" ON "ExternalOrder"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalOrder_connectionId_externalOrderId_key" ON "ExternalOrder"("connectionId", "externalOrderId");

-- CreateIndex
CREATE INDEX "InternalOrderExternalLink_connectionId_idx" ON "InternalOrderExternalLink"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "InternalOrderExternalLink_internalOrderId_externalOrderId_key" ON "InternalOrderExternalLink"("internalOrderId", "externalOrderId");

-- AddForeignKey
ALTER TABLE "ExternalProductMapping" ADD CONSTRAINT "ExternalProductMapping_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "StoreConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalProductMapping" ADD CONSTRAINT "ExternalProductMapping_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProductTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalProductMapping" ADD CONSTRAINT "ExternalProductMapping_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "TemplateVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalProductMapping" ADD CONSTRAINT "ExternalProductMapping_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalProductMapping" ADD CONSTRAINT "ExternalProductMapping_templateProductId_fkey" FOREIGN KEY ("templateProductId") REFERENCES "TemplateProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalOrder" ADD CONSTRAINT "ExternalOrder_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "StoreConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalOrderItem" ADD CONSTRAINT "ExternalOrderItem_externalOrderId_fkey" FOREIGN KEY ("externalOrderId") REFERENCES "ExternalOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalOrderExternalLink" ADD CONSTRAINT "InternalOrderExternalLink_internalOrderId_fkey" FOREIGN KEY ("internalOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalOrderExternalLink" ADD CONSTRAINT "InternalOrderExternalLink_externalOrderId_fkey" FOREIGN KEY ("externalOrderId") REFERENCES "ExternalOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalOrderExternalLink" ADD CONSTRAINT "InternalOrderExternalLink_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "StoreConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
