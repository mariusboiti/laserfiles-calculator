'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleWpSso() {
    setError(null);
    setLoading(true);
    const API_BASE =
      process.env.NEXT_PUBLIC_API_URL || 'https://api.laserfilespro.com';
    const returnUrl = encodeURIComponent(
      'https://studio.laserfilespro.com/auth/wp/callback',
    );
    window.location.href = `${API_BASE.replace(/\/$/, '')}/auth/wp/start?returnUrl=${returnUrl}`;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-slate-900/80 p-8 shadow-xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Laser Workshop</h1>
          <p className="mt-1 text-sm text-slate-400">Access Studio using your LaserFilesPro account</p>
          <p className="mt-3 text-sm text-slate-300">
            To use Studio, you need an active LaserFilesPro account. If you are not signed in on the website,
            please create an account first.
          </p>
        </div>
        <div className="mt-4 space-y-2 border-t border-slate-800 pt-4">
          <div className="space-y-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleWpSso}
              className="inline-flex w-full items-center justify-center rounded-md border border-sky-500 px-4 py-2 text-sm font-medium text-sky-100 hover:bg-sky-500/10 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              {loading ? 'Connecting…' : 'Continue to Studio'}
            </button>

            <a
              href="https://laserfilespro.com/my-account"
              className="inline-flex w-full items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Create account
            </a>

            <a
              href="https://laserfilespro.com"
              className="inline-flex w-full items-center justify-center rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Back to Website
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
