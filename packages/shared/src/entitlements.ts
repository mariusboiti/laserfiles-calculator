// Shared entitlements schema for plans, feature flags, and limits

export type PlanName = 'GUEST' | 'FREE' | 'STARTER' | 'PRO' | 'LIFETIME';

export interface FeatureFlags {
  pricing_basic: boolean;
  pricing_advanced: boolean;
  templates_basic: boolean;
  templates_unlimited: boolean;
  personalization: boolean;
  sales_channels_import: boolean;
  etsy_sync: boolean;
  woo_sync: boolean;
  batch_mode: boolean;
  season_mode: boolean;
  offcuts: boolean;
  exports_basic: boolean;
  exports_advanced: boolean;
  analytics_basic: boolean;
  // allow forward-compatible feature flags without changing the type
  [key: string]: boolean;
}

export interface EntitlementLimits {
  max_templates?: number;
  max_active_batches?: number;
  max_offcuts_tracked?: number;
  monthly_import_orders?: number;
  max_users_per_workspace?: number;
  // allow additional numeric limits
  [key: string]: number | undefined;
}

export const ENTITLEMENTS_VERSION = '1.0' as const;

export interface Entitlements {
  entitlementsVersion: typeof ENTITLEMENTS_VERSION;
  plan: PlanName;
  features: FeatureFlags;
  limits: EntitlementLimits;
  /** ISO timestamp; null or undefined means no known expiry */
  validUntil?: string | null;
}

export interface IdentityEntitlements extends Entitlements {
  wpUserId: string;
  email: string;
  displayName: string;
}
