import { NextRequest } from 'next/server';
import { isEntitlementError, type EntitlementError } from '@/lib/entitlements/server';

export async function consumeAiCreditViaBackend(args: {
  req: NextRequest;
  toolSlug: string;
  actionType: string;
  provider: string;
  payload: Record<string, unknown>;
}): Promise<{ used: number; remaining: number }> {
  const { req, toolSlug, actionType, provider, payload } = args;

  const internalBaseUrl = process.env.INTERNAL_API_URL;
  const baseUrl = internalBaseUrl && internalBaseUrl.length > 0 ? internalBaseUrl : req.nextUrl.origin;
  const apiUrl = `${baseUrl}/api-backend/entitlements/consume-ai-credit`;
  console.log(
    `[AI-Credit-Util] Consuming credit: ${toolSlug}/${actionType} via ${apiUrl} (internal=${Boolean(internalBaseUrl)})`
  );

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(req.headers.get('authorization')
        ? { Authorization: req.headers.get('authorization') as string }
        : {}),
      ...(req.headers.get('cookie') ? { Cookie: req.headers.get('cookie') as string } : {}),
    },
    credentials: 'include',
    cache: 'no-store',
    body: JSON.stringify({
      toolSlug,
      actionType,
      provider,
      metadata: { payloadKeys: Object.keys(payload) },
    }),
  });

  const json = await res.json().catch(() => null);
  
  if (!res.ok || !json?.ok) {
    const code = json?.error?.code || json?.error?.name || 'AI_ERROR';
    const message = json?.error?.message || json?.message || 'Failed to consume AI credit';
    console.error(
      `[AI-Credit-Util] Credit consumption FAILED: http=${res.status} code=${code} message=${message}`
    );
    if (json) {
      console.error(`[AI-Credit-Util] Credit consumption response body: ${JSON.stringify(json)}`);
    }
    const err: any = { code, message, httpStatus: res.status || 500 };
    throw err;
  }

  const total = Number(json?.data?.aiCreditsTotal ?? 0);
  const used = Number(json?.data?.aiCreditsUsed ?? 0);
  const remaining = Number(json?.data?.aiCreditsRemaining ?? Math.max(0, total - used));
  
  console.log(`[AI-Credit-Util] Credit consumption SUCCESS: used=${used}, remaining=${remaining}`);
  return { used, remaining };
}

export { isEntitlementError, type EntitlementError };
