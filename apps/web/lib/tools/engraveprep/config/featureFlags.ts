/**
 * Feature flags for EngravePrep.
 *
 * Test Card is currently experimental and gated behind NEXT_PUBLIC_ENABLE_TEST_CARD.
 * If the env var is not set, the feature is disabled by default.
 *
 * To enable in development, add this to your .env file:
 *   NEXT_PUBLIC_ENABLE_TEST_CARD=true
 */

const rawFlag = typeof window !== 'undefined' 
  ? process.env.NEXT_PUBLIC_ENABLE_TEST_CARD 
  : undefined;

export const ENABLE_TEST_CARD: boolean = rawFlag === 'true';
