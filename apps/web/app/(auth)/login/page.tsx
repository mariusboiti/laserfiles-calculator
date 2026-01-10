'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = res.data;

      window.localStorage.setItem('accessToken', accessToken);
      window.localStorage.setItem('refreshToken', refreshToken);
      window.localStorage.setItem('user', JSON.stringify(user));

      router.push('/');
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Login failed';
      setError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setLoading(false);
    }
  }

  function handleWpSso() {
    setError(null);
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
          <p className="mt-1 text-sm text-slate-400">Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-200">Email</label>
            <input
              type="email"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-200">Password</label>
            <input
              type="password"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="mt-4 space-y-2 border-t border-slate-800 pt-4">
          <p className="text-xs text-slate-400">Or sign in with your LaserfilesPro membership account.</p>
          <div className="space-y-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleWpSso}
              className="inline-flex w-full items-center justify-center rounded-md border border-sky-500 px-4 py-2 text-sm font-medium text-sky-100 hover:bg-sky-500/10 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              {loading ? 'Connecting…' : 'Continue with LaserFilesPro'}
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Demo users: admin@example.com / admin123, worker@example.com / worker123
        </p>
      </div>
    </div>
  );
}
