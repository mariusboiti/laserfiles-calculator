-- CreateEnum
CREATE TYPE "EntitlementPlan" AS ENUM ('INACTIVE', 'TRIALING', 'ACTIVE', 'CANCELED');

-- CreateEnum
CREATE TYPE "TourStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('BUG', 'FEATURE');

-- CreateEnum
CREATE TYPE "FeedbackSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'TRIAGED', 'PLANNED', 'DONE', 'CLOSED');

-- CreateTable
CREATE TABLE "UserEntitlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "EntitlementPlan" NOT NULL DEFAULT 'INACTIVE',
    "trialStartedAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "aiCreditsTotal" INTEGER NOT NULL DEFAULT 0,
    "aiCreditsUsed" INTEGER NOT NULL DEFAULT 0,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "creditsGrantMonthlyAmount" INTEGER NOT NULL DEFAULT 200,
    "creditsNextGrantAt" TIMESTAMP(3),
    "creditsLastGrantAt" TIMESTAMP(3),
    "trialCreditsGrantedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entitlementId" TEXT NOT NULL,
    "toolSlug" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "creditsConsumed" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolSlug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fileSvgUrl" TEXT,
    "fileDxfUrl" TEXT,
    "filePdfUrl" TEXT,
    "previewPngUrl" TEXT,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolSlug" TEXT NOT NULL,
    "status" "TourStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "lastStepIndex" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT,
    "type" "FeedbackType" NOT NULL,
    "toolSlug" TEXT,
    "pageUrl" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "FeedbackSeverity",
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackAttachment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserEntitlement_userId_key" ON "UserEntitlement"("userId");

-- CreateIndex
CREATE INDEX "UserEntitlement_stripeCustomerId_idx" ON "UserEntitlement"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "UserEntitlement_stripeSubscriptionId_idx" ON "UserEntitlement"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "AiUsageEvent_userId_createdAt_idx" ON "AiUsageEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsageEvent_entitlementId_createdAt_idx" ON "AiUsageEvent"("entitlementId", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsageEvent_toolSlug_actionType_idx" ON "AiUsageEvent"("toolSlug", "actionType");

-- CreateIndex
CREATE INDEX "Artifact_userId_createdAt_idx" ON "Artifact"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Artifact_userId_toolSlug_idx" ON "Artifact"("userId", "toolSlug");

-- CreateIndex
CREATE INDEX "Artifact_toolSlug_idx" ON "Artifact"("toolSlug");

-- CreateIndex
CREATE INDEX "TourProgress_userId_idx" ON "TourProgress"("userId");

-- CreateIndex
CREATE INDEX "TourProgress_toolSlug_idx" ON "TourProgress"("toolSlug");

-- CreateIndex
CREATE UNIQUE INDEX "TourProgress_userId_toolSlug_key" ON "TourProgress"("userId", "toolSlug");

-- CreateIndex
CREATE INDEX "FeedbackTicket_userId_idx" ON "FeedbackTicket"("userId");

-- CreateIndex
CREATE INDEX "FeedbackTicket_status_idx" ON "FeedbackTicket"("status");

-- CreateIndex
CREATE INDEX "FeedbackTicket_type_idx" ON "FeedbackTicket"("type");

-- CreateIndex
CREATE INDEX "FeedbackTicket_toolSlug_idx" ON "FeedbackTicket"("toolSlug");

-- CreateIndex
CREATE INDEX "FeedbackAttachment_ticketId_idx" ON "FeedbackAttachment"("ticketId");

-- AddForeignKey
ALTER TABLE "UserEntitlement" ADD CONSTRAINT "UserEntitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "UserEntitlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackAttachment" ADD CONSTRAINT "FeedbackAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "FeedbackTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
