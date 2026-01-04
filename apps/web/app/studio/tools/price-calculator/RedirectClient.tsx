'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectClient({ to }: { to: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(to);
  }, [router, to]);

  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-sm text-slate-400">Redirecting...</div>
    </div>
  );
}
