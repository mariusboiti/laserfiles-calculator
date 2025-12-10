'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = window.localStorage.getItem('accessToken');
    const storedUser = window.localStorage.getItem('user');
    const storedEntitlements = window.localStorage.getItem('entitlements');

    if (!accessToken) {
      router.replace('/login');
      return;
    }

    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUserName(parsed.name || parsed.email || null);
      } catch {
        // ignore
      }
    }

    if (storedEntitlements) {
      try {
        const ent = JSON.parse(storedEntitlements);
        setPlan(ent.plan || null);
      } catch {
        // ignore
      }
    }

    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <span className="text-sm text-slate-400">Loading…</span>
      </div>
    );
  }

  const navItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/orders', label: 'Orders' },
    { href: '/customers', label: 'Customers' },
    { href: '/materials', label: 'Materials' },
    { href: '/offcuts', label: 'Scrap & Offcuts' },
    { href: '/templates', label: 'Templates' },
    { href: '/template-products', label: 'Template Products' },
    { href: '/sales-channels', label: 'Sales Channels' },
    { href: '/today-queue', label: 'Today Queue' },
    { href: '/seasons', label: 'Seasons & Batches' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/quotes', label: 'Quotes' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="hidden w-56 flex-col border-r border-slate-800 bg-slate-900/80 p-4 md:flex">
        <div className="mb-6 text-lg font-semibold tracking-tight">Laser Workshop</div>
        <nav className="space-y-1 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 hover:bg-slate-800 ${
                pathname === item.href ? 'bg-slate-800 text-sky-400' : 'text-slate-300'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-4 text-xs text-slate-500 space-y-1">
          {userName ? <div>Signed in as {userName}</div> : null}
          {plan ? <div>Plan: {plan}</div> : null}
        </div>
      </aside>
      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-slate-200">Admin</div>
            {plan ? (
              <span className="rounded-full border border-sky-500/60 bg-sky-500/10 px-2 py-0.5 text-xs text-sky-300">
                {plan} plan
              </span>
            ) : null}
          </div>
          <button
            onClick={() => {
              window.localStorage.removeItem('accessToken');
              window.localStorage.removeItem('refreshToken');
              window.localStorage.removeItem('user');
              window.localStorage.removeItem('entitlements');
              router.push('/login');
            }}
            className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            Logout
          </button>
        </header>
        <div className="flex-1 bg-slate-950 px-4 py-4 md:px-6 md:py-6">{children}</div>
      </main>
    </div>
  );
}
