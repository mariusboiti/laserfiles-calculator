import { Injectable, Optional, Logger } from '@nestjs/common';
import { ENTITLEMENTS_VERSION, IdentityEntitlements, PlanName, FeatureFlags, EntitlementLimits } from '@laser/shared/entitlements';
import type { WpGetEntitlementsResponse } from '@laser/shared/wp-plugin-contract';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

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
  async getUiEntitlementsForUserId(userId: string): Promise<{
    plan: 'NONE' | 'TRIALING' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
    trialStartedAt: string | null;
    trialEndsAt: string | null;
    aiCreditsTotal: number;
    aiCreditsUsed: number;
    aiCreditsRemaining: number;
    isActive: boolean;
    daysLeftInTrial: number | null;
    stripeCustomerId: string | null;
  }> {
    if (!this.prisma) {
      // Should not happen in prod, but keep safe fallback
      return {
        plan: 'NONE',
        trialStartedAt: null,
        trialEndsAt: null,
        aiCreditsTotal: 0,
        aiCreditsUsed: 0,
        aiCreditsRemaining: 0,
        isActive: false,
        daysLeftInTrial: null,
        stripeCustomerId: null,
      };
    }

    const ent = await this.prisma.userEntitlement.findUnique({
      where: { userId },
    });

    const total = Number(ent?.aiCreditsTotal ?? 0);
    const used = Number(ent?.aiCreditsUsed ?? 0);
    const remaining = Math.max(0, total - used);

    // NOTE: in DB you currently have plan like ACTIVE (status), which matches UI type.
    const plan =
  (ent?.plan as any) &&
  ['NONE', 'TRIALING', 'ACTIVE', 'INACTIVE', 'EXPIRED'].includes(String(ent?.plan))
    ? (ent?.plan as any)
    : ent
      ? 'ACTIVE'
      : 'NONE';

    return {
      plan,
      trialStartedAt: null,
      trialEndsAt: null,
      aiCreditsTotal: total,
      aiCreditsUsed: used,
      aiCreditsRemaining: remaining,
      isActive: plan === 'ACTIVE' || plan === 'TRIALING',
      daysLeftInTrial: null,
      stripeCustomerId: null,
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

    // Ultimate fallback: dev-style PRO entitlements
    const fresh = this.getDevEntitlements(wpUserId);
    this.cache.set(wpUserId, { data: fresh, expiresAt: now + this.ttlMs });
    return fresh;
  }

  /**
   * Fetch entitlements from the WordPress plugin REST API.
   * Returns null if WP plugin is not configured or the request fails.
   */
  private async fetchEntitlementsFromWpPlugin(wpUserId: string): Promise<IdentityEntitlements | null> {
    if (!this.wpPluginBaseUrl || !this.wpPluginApiKey) {
      // WP plugin not configured, skip
      return null;
    }

    try {
      const url = `${this.wpPluginBaseUrl}/entitlements/${encodeURIComponent(wpUserId)}`;
      const response = await axios.get<WpGetEntitlementsResponse>(url, {
        headers: {
          Authorization: `Bearer ${this.wpPluginApiKey}`,
          'Content-Type': 'application/json',
        },
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
