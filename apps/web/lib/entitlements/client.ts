/**
 * Entitlement Client Hooks
 * Provides React hooks for accessing entitlement status
 */

import { useState, useEffect, useCallback } from 'react';

export type EntitlementStatus = {
  plan: 'TRIALING' | 'ACTIVE' | 'INACTIVE' | 'CANCELED';
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
  plan: 'INACTIVE',
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

function getWpBaseUrl(): string {
  // Keep this configurable. In production, set NEXT_PUBLIC_WP_BASE_URL=https://laserfilespro.com
  return (
    (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_WP_BASE_URL || '')) ||
    'https://laserfilespro.com'
  ).replace(/\/$/, '');
}

function getWpCheckoutBaseUrl(): string {
  const base = getWpBaseUrl();

  const explicit =
    (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_WP_CHECKOUT_URL || '')) || '';
  if (explicit) {
    const full = explicit.startsWith('http') ? explicit : `${base}${explicit.startsWith('/') ? '' : '/'}${explicit}`;
    return full.replace(/\/$/, '');
  }

  const path =
    (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_WP_CHECKOUT_PATH || '')) ||
    '/checkout/';

  return `${base}${path.startsWith('/') ? '' : '/'}${path}`.replace(/\/$/, '');
}

function getWpCheckoutAddToCartUrl(productId: number): string {
  // Important:
  // If WordPress redirects /checkout/ -> /checkout-2-2/ (or another canonical slug),
  // WooCommerce may apply add-to-cart twice (once per request).
  // Always use the canonical checkout URL to avoid redirect loops.
  const checkout = getWpCheckoutBaseUrl();
  return `${checkout}/?add-to-cart=${encodeURIComponent(String(productId))}&quantity=1`;
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
        const incoming = data.data as any;
        const planRaw = String(incoming?.plan ?? '').toUpperCase();
        const plan: EntitlementStatus['plan'] =
          planRaw === 'TRIALING' || planRaw === 'ACTIVE' || planRaw === 'INACTIVE' || planRaw === 'CANCELED'
            ? (planRaw as EntitlementStatus['plan'])
            : 'INACTIVE';

        setEntitlement({
          ...(incoming as EntitlementStatus),
          plan,
        });
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
    // Plans are purchased in WordPress (WooCommerce). Studio only redirects.
    // Monthly product id (trial starts here): 2817
    window.location.href = getWpCheckoutAddToCartUrl(2817);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to start trial' };
  }
}

export async function startSubscription(
  interval: 'monthly' | 'annual',
): Promise<{ success: boolean; error?: string }> {
  try {
    // Plans are purchased in WordPress (WooCommerce)
    const productId = interval === 'annual' ? 2820 : 2817;
    window.location.href = getWpCheckoutAddToCartUrl(productId);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to start subscription' };
  }
}

export async function startTopup(
  wpProductId: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Top-ups should appear in WordPress “My Account”, so Studio redirects to WooCommerce checkout.
    window.location.href = getWpCheckoutAddToCartUrl(wpProductId);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to purchase top-up' };
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
  if (entitlement.plan === 'INACTIVE') return 'Your plan is inactive. Renew to continue using AI credits.';
  if (entitlement.plan === 'CANCELED') return 'Your subscription was canceled. Renew to continue using AI credits.';

  return 'AI credits status unavailable.';
}
