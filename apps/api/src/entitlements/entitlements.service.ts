import { Injectable, Optional, Logger, ForbiddenException, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { ENTITLEMENTS_VERSION, IdentityEntitlements, PlanName, FeatureFlags, EntitlementLimits } from '@laser/shared/entitlements';
import type { WpGetEntitlementsResponse } from '@laser/shared/wp-plugin-contract';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestCountry, type RequestLike } from '../common/geo/country.resolver';
import axios from 'axios';
import * as bcrypt from 'bcryptjs';

const TRIAL_LEVEL_ID = 2;
const MONTHLY_LEVEL_ID = 1;
const ANNUAL_LEVEL_ID = 3;

interface CacheEntry {
  data: IdentityEntitlements;
  expiresAt: number;
}

@Injectable()
export class EntitlementsService {
  private readonly logger = new Logger(EntitlementsService.name);
  private cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number;
  private readonly wpPluginBaseUrl: string | null;
  private readonly wpPluginApiKey: string | null;

  constructor(@Optional() private readonly prisma?: PrismaService) {
    const ttlEnv = process.env.ENTITLEMENTS_CACHE_TTL_MS;
    this.ttlMs = ttlEnv ? Number(ttlEnv) : 10 * 60 * 1000; // default 10 minutes
    this.wpPluginBaseUrl = process.env.WP_PLUGIN_BASE_URL || null;
    this.wpPluginApiKey = process.env.WP_PLUGIN_API_KEY || null;
  }

  /**
   * UI entitlement endpoint (Studio):
   * Reads UserEntitlement by internal UUID userId and returns credits + status.
   */
  async getUiEntitlementsForUserId(
    userId: string,
    req?: RequestLike,
  ): Promise<{
    plan: 'TRIALING' | 'ACTIVE' | 'INACTIVE' | 'CANCELED' | 'FREE_RO' | 'FREE';
    trialStartedAt: string | null;
    trialEndsAt: string | null;
    aiCreditsTotal: number;
    aiCreditsUsed: number;
    aiCreditsRemaining: number;
    isActive: boolean;
    daysLeftInTrial: number | null;
    stripeCustomerId: string | null;
    canUseStudio: boolean;
    canUseAi: boolean;
    trialEligible: boolean;
    graceUntil: string | null;
    country: string | null;
    reason: string;
  }> {
    if (!this.prisma) {
      // Should not happen in prod, but keep safe fallback
      return {
        plan: 'INACTIVE',
        trialStartedAt: null,
        trialEndsAt: null,
        aiCreditsTotal: 0,
        aiCreditsUsed: 0,
        aiCreditsRemaining: 0,
        isActive: false,
        daysLeftInTrial: null,
        stripeCustomerId: null,
        canUseStudio: false,
        canUseAi: false,
        trialEligible: true,
        graceUntil: null,
        country: null,
        reason: 'PRISMA_UNAVAILABLE',
      };
    }

    const [ent, user] = await this.prisma.$transaction([
      this.prisma.userEntitlement.findUnique({ where: { userId } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
    ]);

    const now = new Date();

    const country = getRequestCountry(req);
    const roFreeEnabled = (process.env.RO_FREE_ENABLED || '').trim() === '1' || (process.env.RO_FREE_ENABLED || '').trim().toLowerCase() === 'true';
    const roCodes = (process.env.RO_FREE_COUNTRY_CODES || 'RO')
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const isRo = Boolean(country) && roCodes.includes(String(country));
    const graceDays = Number(process.env.NON_RO_FREE_GRACE_DAYS || '7');
    const graceMs = (Number.isFinite(graceDays) && graceDays > 0 ? graceDays : 7) * 24 * 60 * 60 * 1000;
    const graceUntilDate = user?.createdAt ? new Date(user.createdAt.getTime() + graceMs) : null;
    const inGrace = Boolean(graceUntilDate) && graceUntilDate!.getTime() > now.getTime();

    const trialStartedAt = ent?.trialStartedAt ? ent.trialStartedAt.toISOString() : null;
    const trialEndsAt = ent?.trialEndsAt ? ent.trialEndsAt.toISOString() : null;

    let daysLeftInTrial: number | null = null;
    if (ent?.plan === 'TRIALING' && ent.trialEndsAt) {
      const msLeft = ent.trialEndsAt.getTime() - now.getTime();
      daysLeftInTrial = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    }

    const total = Number(ent?.aiCreditsTotal ?? 0);
    const used = Number(ent?.aiCreditsUsed ?? 0);
    const remaining = Math.max(0, total - used);

    const entPlan = String((ent as any)?.plan || '').toUpperCase();
    const isTrialValid =
      entPlan === 'TRIALING' && Boolean(ent?.trialEndsAt) && (ent!.trialEndsAt as Date) > now;

    type UiEntitlementPlan = 'TRIALING' | 'ACTIVE' | 'INACTIVE' | 'CANCELED' | 'FREE_RO' | 'FREE';
    let plan: UiEntitlementPlan = 'INACTIVE';
    if (isTrialValid) {
      plan = 'TRIALING';
    } else if (entPlan === 'INACTIVE') {
      plan = 'INACTIVE';
    } else if (entPlan === 'ACTIVE') {
      plan = 'ACTIVE';
    } else if (entPlan === 'CANCELED') {
      plan = 'CANCELED';
    }

    const hasDbEntitlement = Boolean(ent);
    const isActive = plan === 'ACTIVE' || plan === 'TRIALING';

    // Effective access rules
    const canUseAi = Boolean(isActive && remaining > 0);
    const canUseStudio = Boolean(
      isActive ||
        (roFreeEnabled && isRo) ||
        (!isRo && inGrace),
    );
    const trialEligible = !isActive;
    const graceUntil = !isRo && graceUntilDate ? graceUntilDate.toISOString() : null;

    const reason = (() => {
      if (isActive) return 'ENTITLEMENT_ACTIVE';
      if (roFreeEnabled && isRo) return hasDbEntitlement ? 'RO_FREE_OVERRIDE' : 'RO_FREE';
      if (!isRo && inGrace) return 'NON_RO_GRACE';
      if (!hasDbEntitlement) return 'NO_ENTITLEMENT';
      return 'ENTITLEMENT_INACTIVE';
    })();

    if (!hasDbEntitlement && roFreeEnabled && isRo) {
      plan = 'FREE_RO';
    } else if (!hasDbEntitlement && !isRo) {
      plan = 'FREE';
    }

    this.logger.debug(
      `UI entitlements: userId=${userId} country=${country ?? 'null'} plan=${plan} canUseStudio=${canUseStudio} canUseAi=${canUseAi} reason=${reason}`,
    );

    return {
      plan,
      trialStartedAt,
      trialEndsAt,
      aiCreditsTotal: total,
      aiCreditsUsed: used,
      aiCreditsRemaining: remaining,
      isActive,
      daysLeftInTrial,
      stripeCustomerId: ent?.stripeCustomerId ?? null,
      canUseStudio,
      canUseAi,
      trialEligible,
      graceUntil,
      country,
      reason,
    };
  }

  async applyWpEntitlementPayload(payload: any): Promise<void> {
    if (!this.prisma) {
      throw new Error('Prisma not available');
    }

    const event = String(payload?.event ?? '').toUpperCase();
    if (event && event !== 'ENTITLEMENT_UPDATED') {
      this.logger.debug(`Ignoring WP entitlement payload with event=${event}`);
      return;
    }

    const rawEmail = payload?.email;
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
    if (!email) {
      throw new BadRequestException('Missing email in entitlement payload');
    }

    const wpUserId = payload?.wpUserId ? String(payload.wpUserId) : null;
    const levelId = Number(payload?.levelId ?? 0) || 0;
    const planRaw = String(payload?.plan ?? '').toUpperCase();
    const intervalRaw = String(payload?.interval ?? '').toLowerCase();
    const trialEndsAtInput = payload?.trialEndsAt;
    const aiCreditsTotalInput = payload?.aiCreditsTotal;

    let entPlan: 'INACTIVE' | 'TRIALING' | 'ACTIVE' | 'CANCELED' = 'INACTIVE';
    if (planRaw === 'ACTIVE') {
      entPlan = 'ACTIVE';
    } else if (planRaw === 'TRIAL' || levelId === TRIAL_LEVEL_ID) {
      entPlan = 'TRIALING';
    } else if (planRaw === 'CANCELED') {
      entPlan = 'CANCELED';
    } else {
      entPlan = 'INACTIVE';
    }

    let subscriptionType: 'MONTHLY' | 'ANNUAL' | null = null;
    if (levelId === MONTHLY_LEVEL_ID || intervalRaw === 'monthly') {
      subscriptionType = 'MONTHLY';
    } else if (levelId === ANNUAL_LEVEL_ID || intervalRaw === 'annual') {
      subscriptionType = 'ANNUAL';
    }

    let trialEndsAt: Date | null = null;
    if (trialEndsAtInput) {
      const t = new Date(trialEndsAtInput);
      if (!Number.isNaN(t.getTime())) {
        trialEndsAt = t;
      }
    }

    const prisma = this.prisma;

    // Find or create user by email
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const randomPassword = Math.random().toString(36).slice(2);
      const hashed = await bcrypt.hash(randomPassword, 10);

      try {
        user = await prisma.user.create({
          data: {
            email,
            name: email,
            role: 'WORKER',
            password: hashed,
          },
        });
      } catch (e: any) {
        // Handle race where another request created the user
        user = await prisma.user.findUnique({ where: { email } });
        if (!user) throw e;
      }
    }

    // Optionally persist wpUserId and subscription interval on User for visibility
    const userUpdateData: Record<string, any> = {};
    if (wpUserId) {
      userUpdateData.wpUserId = wpUserId;
    }
    if (subscriptionType) {
      userUpdateData.subscriptionType = subscriptionType;
      userUpdateData.subscriptionStatus =
        entPlan === 'ACTIVE' || entPlan === 'TRIALING' ? 'ACTIVE' : 'CANCELLED';
    }

    if (Object.keys(userUpdateData).length > 0) {
      try {
        user = await prisma.user.update({
          where: { id: user.id },
          data: userUpdateData,
        });
      } catch (e: any) {
        this.logger.warn(`Failed to update user with WP entitlement data: ${e?.message ?? e}`);
      }
    }

    const existing = await prisma.userEntitlement.findUnique({ where: { userId: user.id } });

    let nextTotal = Number(aiCreditsTotalInput ?? existing?.aiCreditsTotal ?? 0);
    if (!Number.isFinite(nextTotal) || nextTotal < 0) {
      nextTotal = 0;
    }

    if (!existing) {
      await prisma.userEntitlement.create({
        data: {
          userId: user.id,
          plan: entPlan,
          trialStartedAt: entPlan === 'TRIALING' ? new Date() : null,
          trialEndsAt,
          aiCreditsTotal: nextTotal,
          aiCreditsUsed: 0,
        },
      });
    } else {
      await prisma.userEntitlement.update({
        where: { userId: user.id },
        data: {
          plan: entPlan,
          trialEndsAt,
          // Intentionally keep aiCreditsUsed unchanged per requirements
          aiCreditsTotal: nextTotal,
          ...(entPlan === 'TRIALING' && !existing.trialStartedAt
            ? { trialStartedAt: new Date() }
            : {}),
        },
      });
    }

    this.logger.log(
      `Applied WP entitlement payload: email=${email} userId=${user.id} plan=${entPlan} total=${nextTotal} interval=${subscriptionType ?? 'n/a'}`,
    );
  }

  async fetchAndApplyEntitlementsByEmail(email: string): Promise<void> {
    const trimmed = (email || '').trim().toLowerCase();
    if (!trimmed) return;

    const apiKey = process.env.LASERFILES_API_KEY || process.env.WP_PLUGIN_API_KEY || '';
    if (!apiKey) {
      this.logger.debug('LASERFILES_API_KEY not configured – skipping entitlements sync by email');
      return;
    }

    const base = (process.env.WP_PLUGIN_BASE_URL || 'https://laserfilespro.com').replace(/\/$/, '');
    const url = `${base}/wp-json/laserfiles/v1/entitlements?email=${encodeURIComponent(trimmed)}`;

    try {
      const response = await axios.get(url, {
        headers: {
          'x-api-key': apiKey,
        },
        timeout: 5000,
      });

      const payload = response?.data;
      if (!payload) {
        return;
      }

      if (!payload.event) {
        payload.event = 'ENTITLEMENT_UPDATED';
      }

      await this.applyWpEntitlementPayload(payload);
    } catch (err: any) {
      this.logger.warn(
        `Failed to fetch entitlements from WP for email=${trimmed}: ${err?.message ?? err}`,
      );
    }
  }

  async consumeAiCredit(input: {
    userId: string;
    toolSlug: string;
    actionType: string;
    provider: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
    aiCreditsTotal: number;
    aiCreditsUsed: number;
    aiCreditsRemaining: number;
    usageEventId: string;
  }> {
    if (!this.prisma) {
      throw new Error('Prisma not available');
    }

    const entitlement = await this.prisma.userEntitlement.findUnique({
      where: { userId: input.userId },
    });

    if (!entitlement) {
      throw new ForbiddenException('AI features require an active trial or subscription');
    }

    const now = new Date();
    const plan = String((entitlement as any).plan || '').toUpperCase();

    if (plan !== 'ACTIVE' && plan !== 'TRIALING') {
      throw new ForbiddenException('AI features require an active trial or subscription');
    }

    if (plan === 'TRIALING') {
      if (!entitlement.trialEndsAt || entitlement.trialEndsAt <= now) {
        throw new ForbiddenException('Trial expired');
      }
    }

    const remaining = Number(entitlement.aiCreditsTotal) - Number(entitlement.aiCreditsUsed);
    if (remaining <= 0) {
      throw new HttpException('AI credits exhausted', HttpStatus.PAYMENT_REQUIRED);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.userEntitlement.update({
        where: { id: entitlement.id },
        data: { aiCreditsUsed: { increment: 1 } },
        select: { aiCreditsTotal: true, aiCreditsUsed: true },
      });

      const usage = await tx.aiUsageEvent.create({
        data: {
          userId: input.userId,
          entitlementId: entitlement.id,
          toolSlug: input.toolSlug,
          actionType: input.actionType,
          provider: input.provider,
          creditsConsumed: 1,
          metadata: input.metadata as any,
        },
        select: { id: true },
      });

      return { updated, usage };
    });

    const aiCreditsTotal = Number(result.updated.aiCreditsTotal ?? 0);
    const aiCreditsUsed = Number(result.updated.aiCreditsUsed ?? 0);
    const aiCreditsRemaining = Math.max(0, aiCreditsTotal - aiCreditsUsed);

    this.logger.debug(
      `AI credit consumed: userId=${input.userId} tool=${input.toolSlug} action=${input.actionType} provider=${input.provider} remaining=${aiCreditsRemaining}`,
    );

    return {
      aiCreditsTotal,
      aiCreditsUsed,
      aiCreditsRemaining,
      usageEventId: result.usage.id,
    };
  }

  async adminAdjustAiCredits(input: {
    actorUserId: string;
    targetUserId?: string;
    targetEmail?: string;
    addCredits?: number;
    setTotal?: number;
    setUsed?: number;
    reason?: string;
  }): Promise<{
    userId: string;
    aiCreditsTotal: number;
    aiCreditsUsed: number;
    aiCreditsRemaining: number;
  }> {
    if (!this.prisma) {
      throw new Error('Prisma not available');
    }

    if (!input.targetUserId && !input.targetEmail) {
      throw new Error('Missing targetUserId or targetEmail');
    }

    const hasAnyAction =
      typeof input.addCredits === 'number' ||
      typeof input.setTotal === 'number' ||
      typeof input.setUsed === 'number';
    if (!hasAnyAction) {
      throw new Error('No credits adjustment specified');
    }

    const addCredits = Number(input.addCredits ?? 0);
    const setTotal = input.setTotal;
    const setUsed = input.setUsed;

    if (typeof input.addCredits === 'number' && (!Number.isFinite(addCredits) || addCredits === 0)) {
      throw new Error('addCredits must be a non-zero number');
    }
    if (typeof setTotal === 'number' && (!Number.isFinite(setTotal) || setTotal < 0)) {
      throw new Error('setTotal must be a non-negative number');
    }
    if (typeof setUsed === 'number' && (!Number.isFinite(setUsed) || setUsed < 0)) {
      throw new Error('setUsed must be a non-negative number');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        ...(input.targetUserId ? { id: input.targetUserId } : {}),
        ...(input.targetEmail ? { email: input.targetEmail } : {}),
      },
      select: { id: true, email: true },
    });

    if (!user?.id) {
      throw new Error('Target user not found');
    }

    const current = await this.prisma.userEntitlement.findUnique({
      where: { userId: user.id },
      select: {
        aiCreditsTotal: true,
        aiCreditsUsed: true,
      },
    });

    const currentTotal = Number(current?.aiCreditsTotal ?? 0);
    const currentUsed = Number(current?.aiCreditsUsed ?? 0);

    let nextTotal = currentTotal;
    let nextUsed = currentUsed;

    if (typeof setTotal === 'number') {
      nextTotal = Math.floor(setTotal);
    }
    if (typeof setUsed === 'number') {
      nextUsed = Math.floor(setUsed);
    }
    if (typeof input.addCredits === 'number') {
      nextTotal = nextTotal + Math.floor(addCredits);
    }

    if (nextTotal < 0) nextTotal = 0;
    if (nextUsed < 0) nextUsed = 0;
    if (nextUsed > nextTotal) {
      throw new Error('aiCreditsUsed cannot exceed aiCreditsTotal');
    }

    await this.prisma.userEntitlement.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        aiCreditsTotal: nextTotal,
        aiCreditsUsed: nextUsed,
      },
      update: {
        aiCreditsTotal: nextTotal,
        aiCreditsUsed: nextUsed,
      },
    });

    this.logger.log(
      `Admin credits adjustment: actor=${input.actorUserId} target=${user.id} email=${user.email} add=${input.addCredits ?? null} setTotal=${setTotal ?? null} setUsed=${setUsed ?? null} reason=${input.reason ?? ''}`,
    );

    return {
      userId: user.id,
      aiCreditsTotal: nextTotal,
      aiCreditsUsed: nextUsed,
      aiCreditsRemaining: Math.max(0, nextTotal - nextUsed),
    };
  }


  async getEntitlementsForWpUser(wpUserId: string): Promise<IdentityEntitlements> {
    // Dev mode: return a fixed PRO entitlement without calling WordPress.
    if (process.env.ENTITLEMENTS_DEV_MODE === '1') {
      return this.getDevEntitlements(wpUserId);
    }

    const now = Date.now();
    const cached = this.cache.get(wpUserId);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    // Try to fetch from WordPress plugin if configured
    const fromWp = await this.fetchEntitlementsFromWpPlugin(wpUserId);
    if (fromWp) {
      this.cache.set(wpUserId, { data: fromWp, expiresAt: now + this.ttlMs });
      return fromWp;
    }

    // Fallback: load from the latest WorkspacePlanSnapshot in DB
    const fromDb = await this.getEntitlementsFromSnapshot(wpUserId);
    if (fromDb) {
      this.cache.set(wpUserId, { data: fromDb, expiresAt: now + this.ttlMs });
      return fromDb;
    }

    if (process.env.ENTITLEMENTS_DEV_MODE === '1') {
      const fresh = this.getDevEntitlements(wpUserId);
      this.cache.set(wpUserId, { data: fresh, expiresAt: now + this.ttlMs });
      return fresh;
    }

    const locked: IdentityEntitlements = {
      entitlementsVersion: ENTITLEMENTS_VERSION,
      plan: 'GUEST',
      features: {} as any,
      limits: {} as any,
      validUntil: null,
      wpUserId,
      email: `${wpUserId}@unknown.local`,
      displayName: `User ${wpUserId}`,
    };
    this.cache.set(wpUserId, { data: locked, expiresAt: now + this.ttlMs });
    return locked;
  }

  /**
   * Fetch entitlements from the WordPress plugin REST API.
   * Returns null if WP plugin is not configured or the request fails.
   */
  private async fetchEntitlementsFromWpPlugin(wpUserId: string): Promise<IdentityEntitlements | null> {
    if (!this.wpPluginBaseUrl) {
      // WP plugin not configured, skip
      return null;
    }

    try {
      const url = `${this.normalizeWpBaseUrl(this.wpPluginBaseUrl)}/entitlements/${encodeURIComponent(
        wpUserId,
      )}`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.wpPluginApiKey) {
        headers.Authorization = `Bearer ${this.wpPluginApiKey}`;
      }

      const response = await axios.get<WpGetEntitlementsResponse>(url, {
        headers,
        timeout: 5000, // 5 second timeout
      });

      if (response.data.success && response.data.data) {
        const d = response.data.data;
        return {
          entitlementsVersion: d.entitlementsVersion,
          plan: d.plan,
          features: d.features,
          limits: d.limits,
          validUntil: d.validUntil,
          wpUserId: d.wpUserId,
          email: d.email,
          displayName: d.displayName,
        };
      }

      return null;
    } catch (err: any) {
      this.logger.warn(
        `Failed to fetch entitlements from WP plugin for user ${wpUserId}: ${err.message}`,
      );
      return null;
    }
  }

  private normalizeWpBaseUrl(baseUrl: string): string {
    const trimmed = baseUrl.replace(/\/$/, '');
    if (trimmed.includes('/wp-json/laserfiles/v1')) {
      return trimmed;
    }
    if (trimmed.includes('/wp-json/')) {
      return trimmed;
    }
    return `${trimmed}/wp-json/laserfiles/v1`;
  }

  clearCacheForWpUser(wpUserId: string): void {
    this.cache.delete(wpUserId);
  }

  /**
   * Load entitlements from the most recent WorkspacePlanSnapshot in the database.
   * Returns null if no snapshot exists or Prisma is not available.
   */
  private async getEntitlementsFromSnapshot(wpUserId: string): Promise<IdentityEntitlements | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const snapshot = await this.prisma.workspacePlanSnapshot.findFirst({
        where: { wpUserId },
        orderBy: { fetchedAt: 'desc' },
      });

      if (!snapshot) {
        return null;
      }

      // Also try to get the linked user's email/displayName from UserIdentityLink
      const identityLink = await this.prisma.userIdentityLink.findFirst({
        where: { provider: 'WORDPRESS', externalUserId: wpUserId },
      });

      return {
        entitlementsVersion: snapshot.entitlementsVersion,
        plan: snapshot.plan as PlanName,
        features: snapshot.featuresJson as FeatureFlags,
        limits: snapshot.limitsJson as EntitlementLimits,
        validUntil: snapshot.validUntil?.toISOString() ?? null,
        wpUserId,
        email: identityLink?.externalEmail ?? `${wpUserId}@unknown.local`,
        displayName: identityLink?.displayName ?? `User ${wpUserId}`,
      };
    } catch {
      // If DB query fails, return null and let caller use fallback
      return null;
    }
  }

  /**
   * Get dev-mode entitlements based on ENTITLEMENTS_DEV_PLAN env var.
   * Defaults to PRO if not set. Supports: GUEST, FREE, STARTER, PRO, LIFETIME
   */
  private getDevEntitlements(wpUserId: string): IdentityEntitlements {
    const envPlan = process.env.ENTITLEMENTS_DEV_PLAN?.toUpperCase();
    const plan: PlanName = this.isValidPlan(envPlan) ? envPlan : 'PRO';

    const config = this.getPlanConfig(plan);

    return {
      entitlementsVersion: ENTITLEMENTS_VERSION,
      plan,
      features: config.features,
      limits: config.limits,
      validUntil: null,
      wpUserId,
      email: `${wpUserId}@dev.local`,
      displayName: `Dev User ${wpUserId} (${plan})`,
    };
  }

  private isValidPlan(plan: string | undefined): plan is PlanName {
    return ['GUEST', 'FREE', 'STARTER', 'PRO', 'LIFETIME'].includes(plan ?? '');
  }

  /**
   * Get feature flags and limits for a given plan.
   * These match the WP_PLAN_CONFIGS in wp-plugin-contract.ts
   */
  private getPlanConfig(plan: PlanName): { features: FeatureFlags; limits: EntitlementLimits } {
    const configs: Record<PlanName, { features: FeatureFlags; limits: EntitlementLimits }> = {
      GUEST: {
        features: {
          pricing_basic: false,
          pricing_advanced: false,
          templates_basic: false,
          templates_unlimited: false,
          personalization: false,
          sales_channels_import: false,
          etsy_sync: false,
          woo_sync: false,
          batch_mode: false,
          season_mode: false,
          offcuts: false,
          exports_basic: false,
          exports_advanced: false,
          analytics_basic: false,
        },
        limits: {
          max_templates: 0,
          max_active_batches: 0,
          max_offcuts_tracked: 0,
          monthly_import_orders: 0,
          max_users_per_workspace: 1,
        },
      },
      FREE: {
        features: {
          pricing_basic: true,
          pricing_advanced: false,
          templates_basic: true,
          templates_unlimited: false,
          personalization: false,
          sales_channels_import: false,
          etsy_sync: false,
          woo_sync: false,
          batch_mode: false,
          season_mode: false,
          offcuts: false,
          exports_basic: true,
          exports_advanced: false,
          analytics_basic: false,
        },
        limits: {
          max_templates: 3,
          max_active_batches: 1,
          max_offcuts_tracked: 0,
          monthly_import_orders: 0,
          max_users_per_workspace: 1,
        },
      },
      STARTER: {
        features: {
          pricing_basic: true,
          pricing_advanced: false,
          templates_basic: true,
          templates_unlimited: false,
          personalization: true,
          sales_channels_import: true,
          etsy_sync: false,
          woo_sync: false,
          batch_mode: true,
          season_mode: false,
          offcuts: true,
          exports_basic: true,
          exports_advanced: false,
          analytics_basic: true,
        },
        limits: {
          max_templates: 10,
          max_active_batches: 5,
          max_offcuts_tracked: 50,
          monthly_import_orders: 100,
          max_users_per_workspace: 2,
        },
      },
      PRO: {
        features: {
          pricing_basic: true,
          pricing_advanced: true,
          templates_basic: true,
          templates_unlimited: true,
          personalization: true,
          sales_channels_import: true,
          etsy_sync: true,
          woo_sync: true,
          batch_mode: true,
          season_mode: true,
          offcuts: true,
          exports_basic: true,
          exports_advanced: true,
          analytics_basic: true,
        },
        limits: {
          max_templates: 1000,
          max_active_batches: 100,
          max_offcuts_tracked: 10000,
          monthly_import_orders: 10000,
          max_users_per_workspace: 10,
        },
      },
      LIFETIME: {
        features: {
          pricing_basic: true,
          pricing_advanced: true,
          templates_basic: true,
          templates_unlimited: true,
          personalization: true,
          sales_channels_import: true,
          etsy_sync: true,
          woo_sync: true,
          batch_mode: true,
          season_mode: true,
          offcuts: true,
          exports_basic: true,
          exports_advanced: true,
          analytics_basic: true,
        },
        limits: {
          max_templates: 100000,
          max_active_batches: 1000,
          max_offcuts_tracked: 100000,
          monthly_import_orders: 100000,
          max_users_per_workspace: 100,
        },
      },
    };

    return configs[plan];
  }
}
