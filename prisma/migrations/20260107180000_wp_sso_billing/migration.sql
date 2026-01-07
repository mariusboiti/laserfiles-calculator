-- CreateEnum
CREATE TYPE "SubscriptionType" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "wpUserId" TEXT;
ALTER TABLE "User" ADD COLUMN     "subscriptionType" "SubscriptionType";
ALTER TABLE "User" ADD COLUMN     "subscriptionStatus" "SubscriptionStatus";

-- CreateIndex
CREATE UNIQUE INDEX "User_wpUserId_key" ON "User"("wpUserId");

-- CreateTable
CREATE TABLE "WpWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WpWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WpWebhookEvent_eventId_key" ON "WpWebhookEvent"("eventId");
