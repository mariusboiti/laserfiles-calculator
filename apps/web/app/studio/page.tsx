'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudioPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/studio/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-sm text-slate-400">Redirecting...</div>
    </div>
  );
}
