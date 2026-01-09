'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';

export default function CallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setError('Missing SSO code.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await apiClient.post('/auth/wp/exchange', { code }, { withCredentials: true });
        if (!cancelled) router.replace('/studio/dashboard');
      } catch (err: any) {
        const message =
          err?.response?.data?.message ||
          'Authentication failed. Please try again.';
        if (!cancelled)
          setError(Array.isArray(message) ? message.join(', ') : message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-xl bg-slate-900/80 p-8 shadow-xl border border-slate-800 text-center">
        {!error ? (
          <>
            <h1 className="text-xl font-semibold text-slate-100">Connecting your account</h1>
            <p className="mt-2 text-sm text-slate-400">Please wait while we sign you in…</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-red-400">Authentication error</h1>
            <p className="mt-2 text-sm text-slate-400">{error}</p>
            <button
              className="mt-4 rounded-md bg-sky-500 px-4 py-2 text-sm text-white hover:bg-sky-600"
              onClick={() =>
                (window.location.href =
                  'https://laserfilespro.com/wp-json/laserfiles/v1/sso/start?returnUrl=https://studio.laserfilespro.com')
              }
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
