/**
 * Entitlement Service - Server-Side
 * Manages AI credits and trial entitlements
 * 
 * NOTE: Run `npx prisma generate` after schema changes to get types
 */

import { PrismaClient } from '@prisma/client';

// Use global prisma client to avoid connection issues in serverless
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Type definitions (matches Prisma schema)
export type EntitlementPlan = 'NONE' | 'TRIALING' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED';

export type UserEntitlement = {
  id: string;
  userId: string;
  plan: EntitlementPlan;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  aiCreditsTotal: number;
  aiCreditsUsed: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AiUsageEvent = {
  id: string;
  userId: string;
  entitlementId: string;
  toolSlug: string;
  actionType: string;
  provider: string;
  creditsConsumed: number;
  metadata: unknown;
  createdAt: Date;
};

export type EntitlementStatus = {
  plan: EntitlementPlan;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  aiCreditsTotal: number;
  aiCreditsUsed: number;
  aiCreditsRemaining: number;
  isActive: boolean;
  daysLeftInTrial: number | null;
  stripeCustomerId: string | null;
};

export type EntitlementError = {
  code: 'NO_ENTITLEMENT' | 'TRIAL_REQUIRED' | 'TRIAL_EXPIRED' | 'CREDITS_EXHAUSTED' | 'SUBSCRIPTION_INACTIVE';
  message: string;
  httpStatus: number;
};

// Helper to access prisma models dynamically (works before prisma generate)
const db = prisma as any;

/**
 * Get or create entitlement for a user
 */
export async function getEntitlementForUser(userId: string): Promise<UserEntitlement> {
  try {
    let entitlement = await db.userEntitlement.findUnique({
      where: { userId },
    });

    if (!entitlement) {
      entitlement = await db.userEntitlement.create({
        data: {
          userId,
          plan: 'NONE',
          aiCreditsTotal: 25,
          aiCreditsUsed: 0,
        },
      });
    }

    return entitlement as UserEntitlement;
  } catch (error) {
    // If table doesn't exist yet (migration not run), return a default entitlement
    console.warn('UserEntitlement table may not exist yet. Run prisma migrate.');
    return {
      id: 'temp-' + userId,
      userId,
      plan: 'NONE',
      trialStartedAt: null,
      trialEndsAt: null,
      aiCreditsTotal: 25,
      aiCreditsUsed: 0,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

/**
 * Get entitlement status with computed fields
 */
export async function getEntitlementStatus(userId: string): Promise<EntitlementStatus> {
  const entitlement = await getEntitlementForUser(userId);
  
  const now = new Date();
  const aiCreditsRemaining = Math.max(0, entitlement.aiCreditsTotal - entitlement.aiCreditsUsed);
  
  let daysLeftInTrial: number | null = null;
  if (entitlement.plan === 'TRIALING' && entitlement.trialEndsAt) {
    const msLeft = entitlement.trialEndsAt.getTime() - now.getTime();
    daysLeftInTrial = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  }

  const isTrialValid = entitlement.plan === 'TRIALING' && 
    entitlement.trialEndsAt && 
    entitlement.trialEndsAt > now;

  const isActive: boolean = Boolean(
    entitlement.plan === 'ACTIVE' || 
    (isTrialValid && aiCreditsRemaining > 0)
  );

  return {
    plan: entitlement.plan,
    trialStartedAt: entitlement.trialStartedAt,
    trialEndsAt: entitlement.trialEndsAt,
    aiCreditsTotal: entitlement.aiCreditsTotal,
    aiCreditsUsed: entitlement.aiCreditsUsed,
    aiCreditsRemaining,
    isActive,
    daysLeftInTrial,
    stripeCustomerId: entitlement.stripeCustomerId,
  };
}

/**
 * Check if user can use AI features. Throws typed error if not.
 */
export async function requireEntitlementForAi(userId: string): Promise<UserEntitlement> {
  const entitlement = await getEntitlementForUser(userId);
  const now = new Date();

  // Check plan status
  if (entitlement.plan === 'NONE' || entitlement.plan === 'INACTIVE') {
    const error: EntitlementError = {
      code: 'TRIAL_REQUIRED',
      message: 'AI features require an active trial or subscription. Start your free trial to get 25 AI credits.',
      httpStatus: 403,
    };
    throw error;
  }

  if (entitlement.plan === 'EXPIRED') {
    const error: EntitlementError = {
      code: 'TRIAL_EXPIRED',
      message: 'Your trial has expired. Please subscribe to continue using AI features.',
      httpStatus: 410,
    };
    throw error;
  }

  // Check trial validity
  if (entitlement.plan === 'TRIALING') {
    if (!entitlement.trialEndsAt || entitlement.trialEndsAt <= now) {
      // Update plan to expired
      try {
        await db.userEntitlement.update({
          where: { id: entitlement.id },
          data: { plan: 'EXPIRED' },
        });
      } catch (e) {
        console.warn('Could not update entitlement:', e);
      }
      
      const error: EntitlementError = {
        code: 'TRIAL_EXPIRED',
        message: 'Your trial has expired. Please subscribe to continue using AI features.',
        httpStatus: 410,
      };
      throw error;
    }
  }

  // Check credits
  const creditsRemaining = entitlement.aiCreditsTotal - entitlement.aiCreditsUsed;
  if (creditsRemaining <= 0) {
    const error: EntitlementError = {
      code: 'CREDITS_EXHAUSTED',
      message: 'You have used all your AI credits. Please upgrade your plan for more credits.',
      httpStatus: 402,
    };
    throw error;
  }

  return entitlement;
}

/**
 * Consume an AI credit and record usage event
 */
export async function consumeAiCredit(params: {
  userId: string;
  toolSlug: string;
  actionType: string;
  provider: string;
  metadata?: Record<string, unknown>;
}): Promise<{
  entitlement: UserEntitlement;
  usageEvent: AiUsageEvent;
  creditsRemaining: number;
}> {
  const { userId, toolSlug, actionType, provider, metadata } = params;

  // First verify entitlement
  const entitlement = await requireEntitlementForAi(userId);

  // Use transaction to ensure atomicity
  const result = await db.$transaction(async (tx: any) => {
    // Increment usage
    const updatedEntitlement = await tx.userEntitlement.update({
      where: { id: entitlement.id },
      data: {
        aiCreditsUsed: { increment: 1 },
      },
    });

    // Record usage event
    const usageEvent = await tx.aiUsageEvent.create({
      data: {
        userId,
        entitlementId: entitlement.id,
        toolSlug,
        actionType,
        provider,
        creditsConsumed: 1,
        metadata: metadata || undefined,
      },
    });

    return { updatedEntitlement, usageEvent };
  });

  const creditsRemaining = result.updatedEntitlement.aiCreditsTotal - result.updatedEntitlement.aiCreditsUsed;

  return {
    entitlement: result.updatedEntitlement,
    usageEvent: result.usageEvent,
    creditsRemaining,
  };
}

/**
 * Start a trial for a user (called after Stripe checkout)
 */
export async function startTrial(params: {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  trialEndsAt: Date;
}): Promise<UserEntitlement> {
  const { userId, stripeCustomerId, stripeSubscriptionId, trialEndsAt } = params;

  const entitlement = await db.userEntitlement.upsert({
    where: { userId },
    update: {
      plan: 'TRIALING',
      trialStartedAt: new Date(),
      trialEndsAt,
      stripeCustomerId,
      stripeSubscriptionId,
      // Reset credits for new trial
      aiCreditsTotal: 25,
      aiCreditsUsed: 0,
    },
    create: {
      userId,
      plan: 'TRIALING',
      trialStartedAt: new Date(),
      trialEndsAt,
      stripeCustomerId,
      stripeSubscriptionId,
      aiCreditsTotal: 25,
      aiCreditsUsed: 0,
    },
  });

  return entitlement;
}

/**
 * Activate subscription (called after trial converts or direct purchase)
 */
export async function activateSubscription(params: {
  userId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId: string;
}): Promise<UserEntitlement | null> {
  const { userId, stripeCustomerId, stripeSubscriptionId } = params;

  // Find entitlement by userId, customerId, or subscriptionId
  let entitlement = await db.userEntitlement.findFirst({
    where: {
      OR: [
        userId ? { userId } : {},
        stripeCustomerId ? { stripeCustomerId } : {},
        { stripeSubscriptionId },
      ].filter(condition => Object.keys(condition).length > 0),
    },
  });

  if (!entitlement) {
    console.warn('No entitlement found for activation:', { userId, stripeCustomerId, stripeSubscriptionId });
    return null;
  }

  return db.userEntitlement.update({
    where: { id: entitlement.id },
    data: {
      plan: 'ACTIVE',
      stripeSubscriptionId,
      // Grant more credits on active subscription
      aiCreditsTotal: { increment: 100 },
    },
  });
}

/**
 * Deactivate subscription (called on cancellation)
 */
export async function deactivateSubscription(params: {
  stripeSubscriptionId: string;
}): Promise<UserEntitlement | null> {
  const { stripeSubscriptionId } = params;

  const entitlement = await db.userEntitlement.findFirst({
    where: { stripeSubscriptionId },
  });

  if (!entitlement) {
    return null;
  }

  return db.userEntitlement.update({
    where: { id: entitlement.id },
    data: {
      plan: 'INACTIVE',
    },
  });
}

/**
 * Update entitlement from Stripe subscription data
 */
export async function syncFromStripeSubscription(params: {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  trialEnd?: number | null;
  currentPeriodEnd?: number;
  userId?: string;
}): Promise<UserEntitlement | null> {
  const { stripeCustomerId, stripeSubscriptionId, status, trialEnd, userId } = params;

  // Find existing entitlement
  let entitlement = await db.userEntitlement.findFirst({
    where: {
      OR: [
        { stripeCustomerId },
        { stripeSubscriptionId },
        userId ? { userId } : {},
      ].filter(c => Object.keys(c).length > 0),
    },
  });

  // Map Stripe status to our plan
  let plan: EntitlementPlan;
  switch (status) {
    case 'trialing':
      plan = 'TRIALING';
      break;
    case 'active':
      plan = 'ACTIVE';
      break;
    case 'canceled':
    case 'unpaid':
    case 'past_due':
      plan = 'INACTIVE';
      break;
    default:
      plan = 'NONE';
  }

  const trialEndsAt = trialEnd ? new Date(trialEnd * 1000) : null;

  if (entitlement) {
    return db.userEntitlement.update({
      where: { id: entitlement.id },
      data: {
        plan,
        stripeCustomerId,
        stripeSubscriptionId,
        trialEndsAt,
        trialStartedAt: plan === 'TRIALING' && !entitlement.trialStartedAt ? new Date() : undefined,
      },
    });
  }

  // If no entitlement and we have userId from metadata, create one
  if (userId) {
    return db.userEntitlement.create({
      data: {
        userId,
        plan,
        stripeCustomerId,
        stripeSubscriptionId,
        trialStartedAt: plan === 'TRIALING' ? new Date() : null,
        trialEndsAt,
        aiCreditsTotal: 25,
        aiCreditsUsed: 0,
      },
    });
  }

  return null;
}

/**
 * Check if error is an EntitlementError
 */
export function isEntitlementError(error: unknown): error is EntitlementError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'httpStatus' in error
  );
}
