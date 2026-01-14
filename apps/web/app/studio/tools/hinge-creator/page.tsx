'use client';

 import { useCallback } from 'react';
 import { useLanguage } from '@/app/(app)/i18n';
 import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

export default function HingeCreatorPage() {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('tools.hinge_creator.title')}</h1>
        <span className="rounded-full bg-slate-700/50 px-3 py-1 text-xs font-medium text-slate-400">
          {t('tools.coming_soon')}
        </span>
      </div>

      <p className="text-sm text-slate-400">
        {t('tools.hinge_creator.subtitle')}
      </p>

      <button
        type="button"
        disabled
        className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-500 opacity-50 cursor-not-allowed"
      >
        {t('tools.coming_soon')}
      </button>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center opacity-60">
        <p className="text-slate-500">{t('tools.under_development')}</p>
      </div>
    </div>
  );
}
