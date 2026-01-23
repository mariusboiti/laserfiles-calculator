'use client';

import { useEffect, useMemo, useState } from 'react';

export default function WpCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'done'>('loading');
  const [message, setMessage] = useState('Signing you in…');

  const code = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('code');
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        if (!code) {
          setStatus('error');
          setMessage('Missing code parameter.');
          return;
        }

        const res = await fetch('/api-backend/auth/wp/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ code }),
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error('Exchange failed (' + res.status + '): ' + txt);
        }

        const data = await res.json();

        if (data?.accessToken) localStorage.setItem('accessToken', data.accessToken);
        if (data?.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);

        setStatus('done');
        setMessage('Done. Redirecting…');

        window.location.replace('/studio');
      } catch (e: any) {
        setStatus('error');
        setMessage(e?.message || 'Unknown error');
      }
    };

    run();
  }, [code]);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 18, fontWeight: 600 }}>WordPress SSO</h1>
      <p style={{ marginTop: 12 }}>{message}</p>
    </div>
  );
}
