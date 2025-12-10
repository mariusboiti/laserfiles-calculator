-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "templateProductId" TEXT;

-- CreateTable
CREATE TABLE "TemplateProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "variantId" TEXT,
    "materialId" TEXT,
    "defaultQuantity" INTEGER NOT NULL DEFAULT 1,
    "personalizationJson" JSONB,
    "priceOverride" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TemplateProduct_templateId_idx" ON "TemplateProduct"("templateId");

-- CreateIndex
CREATE INDEX "TemplateProduct_variantId_idx" ON "TemplateProduct"("variantId");

-- CreateIndex
CREATE INDEX "TemplateProduct_materialId_idx" ON "TemplateProduct"("materialId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_templateProductId_fkey" FOREIGN KEY ("templateProductId") REFERENCES "TemplateProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateProduct" ADD CONSTRAINT "TemplateProduct_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProductTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateProduct" ADD CONSTRAINT "TemplateProduct_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "TemplateVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateProduct" ADD CONSTRAINT "TemplateProduct_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;
