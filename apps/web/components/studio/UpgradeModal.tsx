'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

type UpgradeModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  feature?: string;
};

export function UpgradeModal({ open, onClose, title, feature }: UpgradeModalProps) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[min(520px,calc(100vw-2rem))] rounded-xl border border-slate-800 bg-slate-950 p-5 text-slate-100 shadow-xl">
        <div className="text-lg font-semibold">{title ?? t('upgrade.title')}</div>
        {feature ? (
          <div className="mt-2 text-sm text-slate-300">
            {t('upgrade.requires_pro_prefix')}{' '}
            <span className="font-medium text-slate-100">{feature}</span>
          </div>
        ) : (
          <div className="mt-2 text-sm text-slate-300">{t('upgrade.requires_pro')}</div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900"
          >
            {t('upgrade.close')}
          </button>
          <Link
            href="/pricing"
            className="rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-white hover:bg-sky-600"
          >
            {t('upgrade.view_pricing')}
          </Link>
        </div>
      </div>
    </div>
  );
}
