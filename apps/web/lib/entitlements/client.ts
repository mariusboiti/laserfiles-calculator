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

// IMPORTANT: do NOT mask connectivity/auth issues with fake credits
const defaultEntitlement: EntitlementStatus = {
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

function getAccessToken(): string {
  if (typeof window === 'undefined') return '';
  return (
    window.localStorage.getItem('accessToken') ||
    window.localStorage.getItem('token') ||
    ''
  );
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getAccessToken();
  return {
    ...(extra ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function useEntitlement(): UseEntitlementResult {
  const [entitlement, setEntitlement] = useState<EntitlementStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntitlement = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api-backend/entitlements/me', {
        headers: authHeaders(),
        cache: 'no-store',
        credentials: 'include',
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        setError(`Entitlements request failed: ${response.status} ${text}`);
        setEntitlement(defaultEntitlement);
        return;
      }

      const data = await response.json().catch(() => null);

      if (data?.ok && data?.data) {
        setEntitlement(data.data as EntitlementStatus);
      } else {
        setError(data?.error?.message || 'Failed to fetch entitlement');
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
      headers: authHeaders(),
      credentials: 'include',
    });

    const data = await response.json().catch(() => null);

    if (data?.ok && data?.data?.checkoutUrl) {
      window.location.href = data.data.checkoutUrl;
      return { success: true };
    }

    return { success: false, error: data?.error?.message || 'Failed to start trial' };
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
      headers: authHeaders(),
      credentials: 'include',
    });

    const data = await response.json().catch(() => null);

    if (data?.ok && data?.data?.portalUrl) {
      window.location.href = data.data.portalUrl;
      return { success: true };
    }

    return { success: false, error: data?.error?.message || 'Failed to open billing portal' };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to open billing portal' };
  }
}

export function canUseAi(entitlement: EntitlementStatus | null): boolean {
  if (!entitlement) return false;
  if (!entitlement.isActive && entitlement.plan !== 'TRIALING') return false;
  return entitlement.aiCreditsRemaining > 0;
}

/**
 * Generic helper used by some tools to call server-side AI routes via Next.js.
 * Keeps auth consistent (Bearer token from localStorage).
 *
 * Usage example:
 *   const res = await callAiGateway('/api/ai/silhouette', { method:'POST', body:{...} })
 */
export async function callAiGateway<T = any>(
  url: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  },
): Promise<T> {
  const method = options?.method ?? (options?.body ? 'POST' : 'GET');

  const headers: Record<string, string> = authHeaders({
    ...(options?.headers ?? {}),
  });

  let body: BodyInit | undefined = undefined;
  if (options?.body !== undefined) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
    body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
    signal: options?.signal,
    credentials: 'include',
  });

  const ct = res.headers.get('content-type') || '';
  const payload = ct.includes('application/json')
    ? await res.json().catch(() => null)
    : await res.text().catch(() => '');

  if (!res.ok) {
    const msg =
      typeof payload === 'string'
        ? payload
        : payload?.error?.message || payload?.message || `AI gateway request failed (${res.status})`;
    throw new Error(msg);
  }

  return payload as T;
}

export function getEntitlementMessage(entitlement: EntitlementStatus | null): string {
  if (!entitlement) return 'Checking your AI credits...';

  if (entitlement.plan === 'NONE') {
    return 'No plan active. Start a trial to get AI credits.';
  }

  if (entitlement.plan === 'TRIALING') {
    const days = entitlement.daysLeftInTrial;
    if (typeof days === 'number') return `Trial active — ${days} day(s) left.`;
    return 'Trial active.';
  }

  if (entitlement.plan === 'ACTIVE') {
    return entitlement.aiCreditsRemaining > 0
      ? `${entitlement.aiCreditsRemaining} AI credits remaining.`
      : 'No AI credits remaining.';
  }

  if (entitlement.plan === 'EXPIRED') return 'Your plan expired. Renew to continue using AI credits.';
  if (entitlement.plan === 'INACTIVE') return 'Your plan is inactive. Renew to continue using AI credits.';

  return 'AI credits status unavailable.';
}
