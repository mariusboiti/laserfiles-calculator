'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { GuidedTour } from './guided-tour';
import { LanguageProvider, LanguageSwitcher, useT } from './i18n';
import { DisclaimerProvider, useDisclaimer } from '@/components/legal';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <AppShell>{children}</AppShell>
    </LanguageProvider>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userKey, setUserKey] = useState<string | null>(null);
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
        setUserKey(parsed.id || parsed.email || parsed.name || null);
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
        <span className="text-sm text-slate-400">{t('common.loading')}</span>
      </div>
    );
  }

  const navItems = [
    { href: '/', label: t('nav.dashboard') },
    { href: '/studio', label: 'Studio' },
    { href: '/orders', label: t('nav.orders') },
    { href: '/customers', label: t('nav.customers') },
    { href: '/materials', label: t('nav.materials') },
    { href: '/offcuts', label: t('nav.offcuts') },
    { href: '/templates', label: t('nav.templates') },
    { href: '/template-products', label: t('nav.template_products') },
    { href: '/sales-channels', label: t('nav.sales_channels') },
    { href: '/today-queue', label: t('nav.today_queue') },
    { href: '/seasons', label: t('nav.seasons_batches') },
    { href: '/quotes', label: t('nav.quotes') },
    { href: '/tutorial', label: t('nav.tutorial') },
  ];

  return (
    <DisclaimerProvider userKey={userKey || userName}>
      <div className="flex min-h-screen bg-slate-950 text-slate-100">
        <aside className="hidden w-56 flex-col border-r border-slate-800 bg-slate-900/80 p-4 md:flex">
          <div className="mb-6 text-lg font-semibold tracking-tight">{t('header.app_name')}</div>
          <nav className="space-y-1 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-tour={`nav-${item.href === '/' ? 'dashboard' : item.href.slice(1).replaceAll('/', '-')}`}
                className={`block rounded-md px-3 py-2 hover:bg-slate-800 ${
                  pathname === item.href ? 'bg-slate-800 text-sky-400' : 'text-slate-300'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto pt-4 text-xs text-slate-500 space-y-2">
            {userName ? (
              <div>
                {t('common.signed_in_as')} {userName}
              </div>
            ) : null}
            {plan ? (
              <div>
                {t('common.plan')}: {plan}
              </div>
            ) : null}
            <AppDisclaimerLink />
          </div>
        </aside>
        <main className="flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium text-slate-200">{t('common.admin')}</div>
              {plan ? (
                <span className="rounded-full border border-sky-500/60 bg-sky-500/10 px-2 py-0.5 text-xs text-sky-300">
                  {plan} {t('common.plan')}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <button
                type="button"
                data-tour="header-guided-tour"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('guidedTour:start'));
                }}
                className="rounded-md bg-sky-500 px-3 py-1 text-xs font-medium text-white hover:bg-sky-600"
              >
                {t('header.guided_tour')}
              </button>
              <button
                data-tour="header-logout"
                onClick={() => {
                  window.localStorage.removeItem('accessToken');
                  window.localStorage.removeItem('refreshToken');
                  window.localStorage.removeItem('user');
                  window.localStorage.removeItem('entitlements');
                  window.dispatchEvent(new CustomEvent('guidedTour:stop'));
                  router.push('/login');
                }}
                className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
              >
                {t('header.logout')}
              </button>
            </div>
          </header>
          <div className="flex-1 bg-slate-950 px-6 py-4 md:px-8 md:py-6">{children}</div>
        </main>

        <GuidedTour />
      </div>
    </DisclaimerProvider>
  );
}

function AppDisclaimerLink() {
  const { openDisclaimer } = useDisclaimer();

  return (
    <button
      type="button"
      onClick={openDisclaimer}
      className="text-left text-xs text-slate-500 hover:text-slate-300"
    >
      Disclaimer & Responsibility
    </button>
  );
}
