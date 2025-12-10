/**
 * WordPress Plugin REST API Contract
 *
 * This file defines the expected endpoints, request/response shapes, and error codes
 * for the LaserfilesPro WordPress plugin that handles SSO authentication and
 * membership entitlements.
 *
 * The NestJS API will call these endpoints to:
 * 1. Validate a WordPress SSO token and get user identity
 * 2. Fetch entitlements (plan, features, limits) for a WordPress user
 *
 * Base URL: Configured via WP_PLUGIN_BASE_URL environment variable
 * Example: https://laserfilespro.com/wp-json/laserfiles/v1
 */

import type { PlanName, FeatureFlags, EntitlementLimits } from './entitlements';

// ============================================================================
// ENDPOINT 1: Validate SSO Token
// ============================================================================

/**
 * POST /laserfiles/v1/auth/validate-token
 *
 * Validates a short-lived SSO token issued by WordPress during the OAuth/redirect flow.
 * Returns the WordPress user identity if the token is valid.
 *
 * This token is NOT the same as a WordPress session cookie or JWT.
 * It's a one-time-use token generated when the user clicks "Login with LaserfilesPro"
 * and is redirected back to the app.
 */

export interface WpValidateTokenRequest {
  /** The SSO token received from the redirect callback */
  token: string;
  /** Optional: the app's client ID for additional validation */
  clientId?: string;
}

export interface WpValidateTokenResponse {
  success: true;
  data: {
    /** WordPress user ID (numeric, but returned as string for safety) */
    wpUserId: string;
    /** User's email address */
    email: string;
    /** User's display name */
    displayName: string;
    /** User's WordPress username (login) */
    username: string;
    /** Avatar URL if available */
    avatarUrl?: string;
    /** ISO timestamp when the token was issued */
    issuedAt: string;
    /** ISO timestamp when the token expires (should be very short, e.g., 5 minutes) */
    expiresAt: string;
  };
}

export interface WpValidateTokenErrorResponse {
  success: false;
  error: {
    code: WpAuthErrorCode;
    message: string;
  };
}

export type WpAuthErrorCode =
  | 'TOKEN_INVALID'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_ALREADY_USED'
  | 'USER_NOT_FOUND'
  | 'USER_DISABLED'
  | 'CLIENT_ID_MISMATCH'
  | 'INTERNAL_ERROR';

// ============================================================================
// ENDPOINT 2: Get User Entitlements
// ============================================================================

/**
 * GET /laserfiles/v1/entitlements/{wpUserId}
 *
 * Fetches the current entitlements (plan, features, limits) for a WordPress user.
 * This is called after successful token validation to get the user's membership details.
 *
 * Authentication: Requires a server-to-server API key in the Authorization header.
 * Header: Authorization: Bearer {WP_PLUGIN_API_KEY}
 */

export interface WpGetEntitlementsRequest {
  /** WordPress user ID (path parameter) */
  wpUserId: string;
}

export interface WpGetEntitlementsResponse {
  success: true;
  data: {
    /** WordPress user ID */
    wpUserId: string;
    /** User's email (may have changed since token validation) */
    email: string;
    /** User's display name */
    displayName: string;
    /** Current plan name */
    plan: PlanName;
    /** Schema version for forward compatibility */
    entitlementsVersion: string;
    /** Feature flags for this plan */
    features: FeatureFlags;
    /** Numeric limits for this plan */
    limits: EntitlementLimits;
    /** ISO timestamp when the subscription expires (null = lifetime or no expiry) */
    validUntil: string | null;
    /** ISO timestamp when these entitlements were computed */
    computedAt: string;
  };
}

export interface WpGetEntitlementsErrorResponse {
  success: false;
  error: {
    code: WpEntitlementsErrorCode;
    message: string;
  };
}

export type WpEntitlementsErrorCode =
  | 'USER_NOT_FOUND'
  | 'USER_DISABLED'
  | 'SUBSCRIPTION_EXPIRED'
  | 'NO_ACTIVE_SUBSCRIPTION'
  | 'API_KEY_INVALID'
  | 'API_KEY_MISSING'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

// ============================================================================
// ENDPOINT 3: Refresh Entitlements (Webhook - Optional)
// ============================================================================

/**
 * POST /laserfiles/v1/webhooks/entitlements-changed
 *
 * Webhook endpoint that WordPress calls when a user's entitlements change
 * (e.g., plan upgrade, downgrade, cancellation, renewal).
 *
 * The NestJS API should expose an endpoint to receive this webhook and
 * invalidate the cached entitlements for the affected user.
 *
 * Authentication: HMAC signature in X-Laserfiles-Signature header
 */

export interface WpEntitlementsChangedWebhook {
  /** Event type */
  event: 'entitlements.updated' | 'entitlements.expired' | 'subscription.canceled';
  /** WordPress user ID affected */
  wpUserId: string;
  /** New plan (if applicable) */
  newPlan?: PlanName;
  /** Previous plan (if applicable) */
  previousPlan?: PlanName;
  /** ISO timestamp of the event */
  occurredAt: string;
  /** Unique event ID for idempotency */
  eventId: string;
}

// ============================================================================
// ENDPOINT 4: Generate SSO Login URL
// ============================================================================

/**
 * GET /laserfiles/v1/auth/login-url
 *
 * Generates a WordPress SSO login URL that the app can redirect users to.
 * After successful login, WordPress redirects back to the app with a token.
 *
 * Query params:
 * - redirect_uri: Where to redirect after login (must be whitelisted)
 * - state: Optional state parameter passed back in the redirect
 * - client_id: App's client ID
 */

export interface WpLoginUrlRequest {
  redirectUri: string;
  state?: string;
  clientId: string;
}

export interface WpLoginUrlResponse {
  success: true;
  data: {
    /** Full URL to redirect the user to for WordPress login */
    loginUrl: string;
    /** State parameter that will be returned in the callback */
    state: string;
  };
}

// ============================================================================
// Plan Configuration (Reference)
// ============================================================================

/**
 * Reference: Expected plan configurations in WordPress.
 * These should match the entitlements defined in packages/shared/src/entitlements.ts
 */

export const WP_PLAN_CONFIGS: Record<PlanName, { features: FeatureFlags; limits: EntitlementLimits }> = {
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

// ============================================================================
// Environment Variables Reference
// ============================================================================

/**
 * Environment variables needed to connect to the WordPress plugin:
 *
 * WP_PLUGIN_BASE_URL - Base URL of the WordPress REST API
 *   Example: https://laserfilespro.com/wp-json/laserfiles/v1
 *
 * WP_PLUGIN_API_KEY - Server-to-server API key for authenticated requests
 *   Used in Authorization header for /entitlements endpoint
 *
 * WP_PLUGIN_CLIENT_ID - Client ID for this app instance
 *   Used when generating login URLs and validating tokens
 *
 * WP_PLUGIN_WEBHOOK_SECRET - Secret for verifying webhook signatures
 *   Used to compute HMAC and compare with X-Laserfiles-Signature header
 */
