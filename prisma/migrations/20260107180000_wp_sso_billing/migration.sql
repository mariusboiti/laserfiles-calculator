-- CreateEnum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionType') THEN
    CREATE TYPE "SubscriptionType" AS ENUM ('MONTHLY', 'ANNUAL');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionStatus') THEN
    CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED');
  END IF;
END $$;

-- AlterTable (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='User'
      AND a.attname='wpUserId' AND a.attisdropped=false
  ) THEN
    ALTER TABLE "User" ADD COLUMN "wpUserId" TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='User'
      AND a.attname='subscriptionType' AND a.attisdropped=false
  ) THEN
    ALTER TABLE "User" ADD COLUMN "subscriptionType" "SubscriptionType";
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='User'
      AND a.attname='subscriptionStatus' AND a.attisdropped=false
  ) THEN
    ALTER TABLE "User" ADD COLUMN "subscriptionStatus" "SubscriptionStatus";
  END IF;
END $$;

-- CreateIndex (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='User_wpUserId_key'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX "User_wpUserId_key" ON "User"("wpUserId")';
  END IF;
END $$;

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "WpWebhookEvent" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "payloadJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WpWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='WpWebhookEvent_eventId_key'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX "WpWebhookEvent_eventId_key" ON "WpWebhookEvent"("eventId")';
  END IF;
END $$;
