-- CreateEnum
CREATE TYPE "TemplateFieldType" AS ENUM ('TEXT', 'NUMBER', 'SELECT', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "TemplateRuleType" AS ENUM ('FIXED_BASE', 'PER_CHARACTER', 'PER_CM2', 'PER_ITEM', 'LAYER_MULTIPLIER', 'ADD_ON_LINK');

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "derivedFieldsJson" JSONB,
ADD COLUMN     "personalizationJson" JSONB,
ADD COLUMN     "templateId" TEXT,
ADD COLUMN     "templateVariantId" TEXT;

-- CreateTable
CREATE TABLE "TemplateCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT,
    "defaultMaterialId" TEXT,
    "baseWidthMm" INTEGER,
    "baseHeightMm" INTEGER,
    "layersCount" INTEGER,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateVariant" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultMaterialId" TEXT,
    "widthMm" INTEGER,
    "heightMm" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplatePersonalizationField" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" "TemplateFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "minNumber" DOUBLE PRECISION,
    "maxNumber" DOUBLE PRECISION,
    "maxLength" INTEGER,
    "optionsJson" JSONB,
    "affectsPricing" BOOLEAN NOT NULL DEFAULT false,
    "affectsProductionNotes" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplatePersonalizationField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplatePricingRule" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "variantId" TEXT,
    "ruleType" "TemplateRuleType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "appliesWhenJson" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplatePricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TemplateCategory_slug_key" ON "TemplateCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTemplate_slug_key" ON "ProductTemplate"("slug");

-- CreateIndex
CREATE INDEX "TemplatePricingRule_templateId_idx" ON "TemplatePricingRule"("templateId");

-- CreateIndex
CREATE INDEX "TemplatePricingRule_variantId_idx" ON "TemplatePricingRule"("variantId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProductTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_templateVariantId_fkey" FOREIGN KEY ("templateVariantId") REFERENCES "TemplateVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTemplate" ADD CONSTRAINT "ProductTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TemplateCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTemplate" ADD CONSTRAINT "ProductTemplate_defaultMaterialId_fkey" FOREIGN KEY ("defaultMaterialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateVariant" ADD CONSTRAINT "TemplateVariant_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProductTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateVariant" ADD CONSTRAINT "TemplateVariant_defaultMaterialId_fkey" FOREIGN KEY ("defaultMaterialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplatePersonalizationField" ADD CONSTRAINT "TemplatePersonalizationField_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProductTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplatePricingRule" ADD CONSTRAINT "TemplatePricingRule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProductTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplatePricingRule" ADD CONSTRAINT "TemplatePricingRule_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "TemplateVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
