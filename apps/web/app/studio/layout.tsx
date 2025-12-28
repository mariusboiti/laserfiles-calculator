'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LanguageProvider } from '../(app)/i18n';
import { GuidedTour } from '../(app)/guided-tour';
import { StudioHeader } from '@/components/studio/StudioHeader';

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
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const BYPASS_LOGIN = true;

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      if (BYPASS_LOGIN) {
        setUser({ name: 'Guest' });
        setLoading(false);
        return;
      }
      router.push('/login');
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
    } catch {
      if (BYPASS_LOGIN) {
        setUser({ name: 'Guest' });
        setLoading(false);
        return;
      }
      router.push('/login');
      setLoading(false);
      return;
    }

    setLoading(false);
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <StudioHeader />
      <main className="mx-auto w-full max-w-7xl px-6 py-6 md:px-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
