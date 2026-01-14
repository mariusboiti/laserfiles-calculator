'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
 import { useT } from '@app/i18n';

export default function RedirectClient({ to }: { to: string }) {
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    router.replace(to);
  }, [router, to]);

  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-sm text-slate-400">{t('common.redirecting')}</div>
    </div>
  );
}
