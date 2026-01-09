-- ─────────────────────────────────────────────────────────────
-- AI Credits & Entitlements: enum + tables (idempotent-ish)
-- ─────────────────────────────────────────────────────────────

-- Enum EntitlementPlan
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EntitlementPlan') THEN
    CREATE TYPE "EntitlementPlan" AS ENUM ('NONE','TRIALING','ACTIVE','INACTIVE','EXPIRED');
  END IF;
END $$;

-- Table UserEntitlement
CREATE TABLE IF NOT EXISTS "UserEntitlement" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "plan" "EntitlementPlan" NOT NULL DEFAULT 'NONE',
  "trialStartedAt" TIMESTAMP(3),
  "trialEndsAt" TIMESTAMP(3),
  "aiCreditsTotal" INTEGER NOT NULL DEFAULT 25,
  "aiCreditsUsed" INTEGER NOT NULL DEFAULT 0,
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserEntitlement_pkey" PRIMARY KEY ("id")
);

-- Unique userId
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='UserEntitlement_userId_key'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX "UserEntitlement_userId_key" ON "UserEntitlement"("userId")';
  END IF;
END $$;

-- Index stripe ids
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname=''public'' AND c.relname=''UserEntitlement_stripeCustomerId_idx''
  ) THEN
    EXECUTE 'CREATE INDEX "UserEntitlement_stripeCustomerId_idx" ON "UserEntitlement"("stripeCustomerId")';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname=''public'' AND c.relname=''UserEntitlement_stripeSubscriptionId_idx''
  ) THEN
    EXECUTE 'CREATE INDEX "UserEntitlement_stripeSubscriptionId_idx" ON "UserEntitlement"("stripeSubscriptionId")';
  END IF;
END $$;

-- FK to User (only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'UserEntitlement_userId_fkey'
  ) THEN
    ALTER TABLE "UserEntitlement"
      ADD CONSTRAINT "UserEntitlement_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Table AiUsageEvent
CREATE TABLE IF NOT EXISTS "AiUsageEvent" (
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

-- Indexes AiUsageEvent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname=''public'' AND c.relname=''AiUsageEvent_userId_createdAt_idx''
  ) THEN
    EXECUTE 'CREATE INDEX "AiUsageEvent_userId_createdAt_idx" ON "AiUsageEvent"("userId","createdAt")';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname=''public'' AND c.relname=''AiUsageEvent_entitlementId_createdAt_idx''
  ) THEN
    EXECUTE 'CREATE INDEX "AiUsageEvent_entitlementId_createdAt_idx" ON "AiUsageEvent"("entitlementId","createdAt")';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname=''public'' AND c.relname=''AiUsageEvent_toolSlug_actionType_idx''
  ) THEN
    EXECUTE 'CREATE INDEX "AiUsageEvent_toolSlug_actionType_idx" ON "AiUsageEvent"("toolSlug","actionType")';
  END IF;
END $$;

-- FK AiUsageEvent -> UserEntitlement
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='AiUsageEvent_entitlementId_fkey') THEN
    ALTER TABLE "AiUsageEvent"
      ADD CONSTRAINT "AiUsageEvent_entitlementId_fkey"
      FOREIGN KEY ("entitlementId") REFERENCES "UserEntitlement"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
