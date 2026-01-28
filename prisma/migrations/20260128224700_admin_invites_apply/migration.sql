-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AdminInviteStatus') THEN
    CREATE TYPE "AdminInviteStatus" AS ENUM ('PENDING', 'REDEEMED', 'REVOKED', 'EXPIRED');
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommunityBadge') THEN
    CREATE TYPE "CommunityBadge" AS ENUM ('NONE', 'ADMIN_EDITION', 'COMMUNITY_PARTNER');
  END IF;
END
$$;

-- AlterTable
ALTER TABLE "UserEntitlement"
  ADD COLUMN IF NOT EXISTS "communityBadge" "CommunityBadge" NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "communityBadgeExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AdminInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenLast4" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'PRO',
    "creditsGrant" INTEGER NOT NULL DEFAULT 200,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "status" "AdminInviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "redeemedAt" TIMESTAMP(3),
    "redeemedByUserId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AdminInvite_tokenHash_key" ON "AdminInvite"("tokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminInvite_email_idx" ON "AdminInvite"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminInvite_status_idx" ON "AdminInvite"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminInvite_createdByUserId_idx" ON "AdminInvite"("createdByUserId");
