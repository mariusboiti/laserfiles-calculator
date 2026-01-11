/**
 * Entitlements Module
 * Re-exports client and server functions for AI credits management
 */

// Client-side exports
export {
  useEntitlement,
  startTrial,
  callAiGateway,
  canUseAi,
  getEntitlementMessage,
  type EntitlementStatus,
} from './client';
