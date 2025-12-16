'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      router.push('/login');
      return;
    }

    try {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
    } catch {
      router.push('/login');
      return;
    }

    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="border-b border-slate-800 bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/studio" className="text-lg font-semibold text-sky-400">
                Studio
              </Link>
              <nav className="flex gap-4 text-sm">
                <Link
                  href="/studio/tools/price-calculator"
                  className="text-slate-300 hover:text-sky-400"
                >
                  Price Calculator
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-400">{user.email}</span>
              <Link
                href="/"
                className="rounded-md bg-slate-800 px-3 py-1 text-xs hover:bg-slate-700"
              >
                Back to App
              </Link>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
