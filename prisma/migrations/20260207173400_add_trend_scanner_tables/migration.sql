-- CreateEnum
CREATE TYPE "TrendSource" AS ENUM ('ETSY', 'SHOPIFY', 'AMAZON_HANDMADE', 'PINTEREST', 'TIKTOK', 'INSTAGRAM', 'REDDIT', 'FACEBOOK', 'MAKER_FORUM', 'MANUAL');

-- CreateEnum
CREATE TYPE "TrendCategory" AS ENUM ('PRODUCT_TYPE', 'DESIGN_THEME', 'ENGRAVING_STYLE', 'MATERIAL', 'SEASONAL', 'NICHE');

-- CreateTable
CREATE TABLE "TrendScan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scanType" TEXT NOT NULL DEFAULT 'full',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "trendingProducts" JSONB,
    "styleTrends" JSONB,
    "seasonalForecast" JSONB,
    "opportunityRadar" JSONB,
    "priceInsights" JSONB,
    "sourceBreakdown" JSONB,
    "totalSignalsScanned" INTEGER NOT NULL DEFAULT 0,
    "totalTrendsFound" INTEGER NOT NULL DEFAULT 0,
    "scanDurationMs" INTEGER,
    "aiModel" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrendScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendOpportunity" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "TrendCategory" NOT NULL,
    "sources" "TrendSource"[],
    "keywords" TEXT[],
    "trendStrength" INTEGER NOT NULL DEFAULT 0,
    "growthVelocity" INTEGER NOT NULL DEFAULT 0,
    "competitionDensity" INTEGER NOT NULL DEFAULT 0,
    "profitPotential" INTEGER NOT NULL DEFAULT 0,
    "seasonalityScore" INTEGER NOT NULL DEFAULT 0,
    "overallScore" INTEGER NOT NULL DEFAULT 0,
    "productIdeas" JSONB,
    "recommendedSizes" JSONB,
    "materialSuggestions" TEXT[],
    "styleHints" TEXT[],
    "priceRange" JSONB,
    "peakMonths" INTEGER[],
    "daysUntilPeak" INTEGER,
    "isGapOpportunity" BOOLEAN NOT NULL DEFAULT false,
    "demandLevel" TEXT,
    "supplyLevel" TEXT,
    "gapDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrendOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "watchCategories" "TrendCategory"[],
    "watchKeywords" TEXT[],
    "minTrendStrength" INTEGER NOT NULL DEFAULT 60,
    "notifyInApp" BOOLEAN NOT NULL DEFAULT true,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrendSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendAlert" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "trendData" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrendAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrendScan_userId_createdAt_idx" ON "TrendScan"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TrendScan_status_idx" ON "TrendScan"("status");

-- CreateIndex
CREATE INDEX "TrendOpportunity_scanId_idx" ON "TrendOpportunity"("scanId");

-- CreateIndex
CREATE INDEX "TrendOpportunity_category_idx" ON "TrendOpportunity"("category");

-- CreateIndex
CREATE INDEX "TrendOpportunity_overallScore_idx" ON "TrendOpportunity"("overallScore");

-- CreateIndex
CREATE INDEX "TrendSubscription_userId_isActive_idx" ON "TrendSubscription"("userId", "isActive");

-- CreateIndex
CREATE INDEX "TrendAlert_userId_isRead_createdAt_idx" ON "TrendAlert"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "TrendAlert_subscriptionId_idx" ON "TrendAlert"("subscriptionId");

-- AddForeignKey
ALTER TABLE "TrendOpportunity" ADD CONSTRAINT "TrendOpportunity_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "TrendScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrendAlert" ADD CONSTRAINT "TrendAlert_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "TrendSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
