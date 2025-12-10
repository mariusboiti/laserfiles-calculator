-- CreateEnum
CREATE TYPE "IdentityProvider" AS ENUM ('WORDPRESS');

-- CreateEnum
CREATE TYPE "PlanName" AS ENUM ('GUEST', 'FREE', 'STARTER', 'PRO', 'LIFETIME');

-- CreateTable
CREATE TABLE "UserIdentityLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "IdentityProvider" NOT NULL,
    "externalUserId" TEXT NOT NULL,
    "externalEmail" TEXT,
    "displayName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserIdentityLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspacePlanSnapshot" (
    "id" TEXT NOT NULL,
    "wpUserId" TEXT NOT NULL,
    "plan" "PlanName" NOT NULL,
    "entitlementsVersion" TEXT NOT NULL,
    "featuresJson" JSONB NOT NULL,
    "limitsJson" JSONB NOT NULL,
    "validUntil" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspacePlanSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserIdentityLink_userId_idx" ON "UserIdentityLink"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserIdentityLink_provider_externalUserId_key" ON "UserIdentityLink"("provider", "externalUserId");

-- CreateIndex
CREATE INDEX "WorkspacePlanSnapshot_wpUserId_fetchedAt_idx" ON "WorkspacePlanSnapshot"("wpUserId", "fetchedAt");

-- AddForeignKey
ALTER TABLE "UserIdentityLink" ADD CONSTRAINT "UserIdentityLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
