export type RequestLike = {
  headers?: Record<string, unknown>;
};

function getHeaderValue(headers: Record<string, unknown> | undefined, key: string): string | null {
  if (!headers) return null;
  const value = headers[key] ?? headers[key.toLowerCase()] ?? headers[key.toUpperCase()];
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === 'string' ? first : null;
  }
  return typeof value === 'string' ? value : null;
}

export function getRequestCountry(req: RequestLike | undefined | null): string | null {
  if (!req) return null;

  const cf = getHeaderValue(req.headers, 'cf-ipcountry');
  if (cf) return String(cf).trim().toUpperCase() || null;

  const vercel = getHeaderValue(req.headers, 'x-vercel-ip-country');
  if (vercel) return String(vercel).trim().toUpperCase() || null;

  const debug = getHeaderValue(req.headers, 'x-debug-country');
  if (debug && process.env.NODE_ENV !== 'production') {
    return String(debug).trim().toUpperCase() || null;
  }

  return null;
}
