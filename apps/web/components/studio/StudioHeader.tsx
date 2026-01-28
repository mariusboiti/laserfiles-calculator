'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { STUDIO_NAV, isActivePath } from '@/lib/studio/navigation/studioNav';
import { AICreditsInfoPanel } from '@/components/ai';
import { AiCreditsBadge } from '@/components/studio/AiCreditsBadge';
import { CommunityBadge } from '@/components/studio/CommunityBadge';
import { useDisclaimer } from '@/components/legal';
import { LanguageSwitcher, useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

export function StudioHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aiCreditsOpen, setAiCreditsOpen] = useState(false);
  const { openDisclaimer } = useDisclaimer();
  const { locale } = useLanguage();

  const t = (key: string) => getStudioTranslation(locale as any, key);

  const navLabel = (href: string) => {
    if (href === '/studio/dashboard') return t('nav.dashboard');
    if (href.startsWith('/studio/tools')) return t('nav.tools');
    if (href === '/studio/pricing') return t('nav.pricing');
    if (href.startsWith('/studio/help')) return t('nav.help');
    if (href === '/studio/account') return t('nav.account');
    return href;
  };

  const logout = () => {
    window.localStorage.removeItem('accessToken');
    window.localStorage.removeItem('refreshToken');
    window.localStorage.removeItem('user');
    window.localStorage.removeItem('entitlements');
    router.push('/login');
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-6">
          {/* Left: Logo */}
          <Link
            href="/studio/dashboard"
            className="text-lg font-semibold tracking-tight text-slate-100 transition-colors hover:text-sky-400"
          >
            {t('dashboard.studio_title')}
          </Link>

          {/* Center: Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex" aria-label={t('a11y.main_navigation')}>
            {STUDIO_NAV.map((item) => {
              const active = isActivePath(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-slate-800 text-sky-400'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {navLabel(item.href)}
                </Link>
              );
            })}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={openDisclaimer}
              className="hidden rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 md:inline-flex"
            >
              {t('shell.feedback')}
            </button>
            <div className="hidden items-center gap-2 md:flex">
              <CommunityBadge />
              <AiCreditsBadge />
            </div>
            <button
              type="button"
              onClick={() => setAiCreditsOpen(true)}
              className="hidden rounded-md border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 md:inline-flex"
            >
              {t('dashboard.ai_credits')}
            </button>
            <Link
              href="/studio/tools"
              className="hidden rounded-md bg-sky-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-sky-600 md:inline-flex"
            >
              {t('dashboard.tools')}
            </Link>

            <button
              type="button"
              onClick={logout}
              className="hidden rounded-md border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 md:inline-flex"
            >
              {t('header.logout')}
            </button>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-300 hover:bg-slate-800 hover:text-slate-100 md:hidden"
              aria-label={t('a11y.toggle_menu')}
              aria-expanded={mobileMenuOpen}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <nav
            className="fixed right-0 top-14 bottom-0 w-64 border-l border-slate-800 bg-slate-900 p-4"
            aria-label={t('a11y.mobile_navigation')}
          >
            <div className="space-y-1">
              {STUDIO_NAV.map((item) => {
                const active = isActivePath(pathname, item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-slate-800 text-sky-400'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    {navLabel(item.href)}
                  </Link>
                );
              })}
            </div>
            <div className="mt-4 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openDisclaimer();
                }}
                className="mb-2 block w-full rounded-md border border-slate-700 px-3 py-2 text-left text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
              >
                {t('shell.feedback')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAiCreditsOpen(true);
                }}
                className="mb-2 block w-full rounded-md border border-slate-700 px-3 py-2 text-center text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
              >
                {t('dashboard.ai_credits')}
              </button>
              <Link
                href="/studio/tools"
                className="block w-full rounded-md bg-sky-500 px-3 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-sky-600"
              >
                {t('dashboard.tools')}
              </Link>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="mt-2 block w-full rounded-md border border-slate-700 px-3 py-2 text-center text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
              >
                {t('header.logout')}
              </button>
            </div>
          </nav>
        </div>
      )}

      <AICreditsInfoPanel open={aiCreditsOpen} onClose={() => setAiCreditsOpen(false)} />
    </>
  );
}
