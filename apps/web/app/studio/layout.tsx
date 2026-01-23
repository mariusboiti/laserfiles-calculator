'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LanguageProvider } from '@/app/(app)/i18n';
import { GuidedTour } from '@/app/(app)/guided-tour';
import { StudioHeader } from '@/components/studio/StudioHeader';
import { DisclaimerProvider, useDisclaimer } from '@/components/legal';
import { AppErrorBoundary, ToastProvider, NetworkProvider } from '@/components/system';
import { ReleaseChecklist } from '@/components/dev';
import { apiClient } from '@/lib/api-client';

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <StudioShell>{children}</StudioShell>
      <GuidedTour />
    </LanguageProvider>
  );
}

function StudioShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const isToolPage = pathname.startsWith('/studio/tools');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await apiClient.get('/auth/me', { withCredentials: true });
        if (cancelled) return;
        
        const userData = res.data?.user;
        setUser(userData ?? null);

        if (!userData) {
          router.push('/login');
          return;
        }

        // If user is logged in but cannot access studio (no active plan/trial)
        // and they are not already on the account or pricing page, redirect them.
        const isPublicStudioPage = pathname === '/studio/pricing' || pathname === '/studio/account';
        if (!userData.canAccessStudio && !isPublicStudioPage) {
          router.push('/studio/account');
        }
      } catch {
        if (cancelled) return;
        setUser(null);
        router.push('/login');
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <span className="text-sm text-slate-400">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppErrorBoundary level="app">
      <NetworkProvider>
        <ToastProvider>
          <DisclaimerProvider userKey={user?.id || user?.email || user?.name}>
            <div className="min-h-screen bg-slate-950 text-slate-100">
              <StudioHeader />
              <main
                className={`mx-auto w-full max-w-7xl px-6 md:px-8 overflow-x-hidden ${
                  isToolPage ? 'pt-1 pb-6' : 'py-6'
                }`}
              >
                {children}
              </main>
            </div>
            <ReleaseChecklist />
          </DisclaimerProvider>
        </ToastProvider>
      </NetworkProvider>
    </AppErrorBoundary>
  );
}
