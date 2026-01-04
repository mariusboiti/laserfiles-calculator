'use client';

/**
 * Entitlement Client Hooks
 * Provides React hooks for accessing entitlement status
 */

import { useState, useEffect, useCallback } from 'react';

export type EntitlementStatus = {
  plan: 'NONE' | 'TRIALING' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  aiCreditsTotal: number;
  aiCreditsUsed: number;
  aiCreditsRemaining: number;
  isActive: boolean;
  daysLeftInTrial: number | null;
  stripeCustomerId: string | null;
};

type UseEntitlementResult = {
  entitlement: EntitlementStatus | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const defaultEntitlement: EntitlementStatus = {
  plan: 'NONE',
  trialStartedAt: null,
  trialEndsAt: null,
  aiCreditsTotal: 25,
  aiCreditsUsed: 0,
  aiCreditsRemaining: 25,
  isActive: false,
  daysLeftInTrial: null,
  stripeCustomerId: null,
};

export function useEntitlement(): UseEntitlementResult {
  const [entitlement, setEntitlement] = useState<EntitlementStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntitlement = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/entitlements/me');
      const data = await response.json();
      
      if (data.ok && data.data) {
        setEntitlement(data.data);
      } else {
        setError(data.error?.message || 'Failed to fetch entitlement');
        setEntitlement(defaultEntitlement);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch entitlement');
      setEntitlement(defaultEntitlement);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntitlement();
  }, [fetchEntitlement]);

  return {
    entitlement,
    loading,
    error,
    refetch: fetchEntitlement,
  };
}

/**
 * Start a trial - redirects to Stripe checkout
 */
export async function startTrial(): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/billing/start-trial', {
      method: 'POST',
    });
    
    const data = await response.json();
    
    if (data.ok && data.data?.checkoutUrl) {
      window.location.href = data.data.checkoutUrl;
      return { success: true };
    }
    
    return { success: false, error: data.error?.message || 'Failed to start trial' };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to start trial' };
  }
}

/**
 * Open billing portal
 */
export async function openBillingPortal(): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/billing/portal', {
      method: 'POST',
    });
    
    const data = await response.json();
    
    if (data.ok && data.data?.portalUrl) {
      window.location.href = data.data.portalUrl;
      return { success: true };
    }
    
    return { success: false, error: data.error?.message || 'Failed to open billing portal' };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to open billing portal' };
  }
}

/**
 * Call AI Gateway
 */
export async function callAiGateway(params: {
  toolSlug: string;
  actionType: string;
  provider: 'gemini' | 'openai';
  payload: Record<string, unknown>;
}): Promise<{
  ok: true;
  data: unknown;
  credits: { used: number; remaining: number };
} | {
  ok: false;
  error: { code: string; message: string };
}> {
  try {
    const response = await fetch('/api/ai/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    return await response.json();
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Network error',
      },
    };
  }
}

/**
 * Check if user can use AI (has active entitlement with credits)
 */
export function canUseAi(entitlement: EntitlementStatus | null): boolean {
  if (!entitlement) return false;
  return entitlement.isActive && entitlement.aiCreditsRemaining > 0;
}

/**
 * Get user-friendly message for entitlement status
 */
export function getEntitlementMessage(entitlement: EntitlementStatus | null): string {
  if (!entitlement) return 'Loading...';
  
  if (entitlement.plan === 'NONE') {
    return 'Start your free trial to use AI features (25 credits included)';
  }
  
  if (entitlement.plan === 'EXPIRED') {
    return 'Your trial has expired. Subscribe to continue using AI features.';
  }
  
  if (entitlement.plan === 'INACTIVE') {
    return 'Your subscription is inactive. Please update your payment method.';
  }
  
  if (entitlement.aiCreditsRemaining <= 0) {
    return 'You\'ve used all your AI credits. Upgrade for more.';
  }
  
  if (entitlement.plan === 'TRIALING' && entitlement.daysLeftInTrial !== null) {
    return `Trial: ${entitlement.daysLeftInTrial} days left, ${entitlement.aiCreditsRemaining} credits remaining`;
  }
  
  return `${entitlement.aiCreditsRemaining} AI credits remaining`;
}
