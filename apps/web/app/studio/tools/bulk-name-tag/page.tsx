'use client';

 import { useCallback } from 'react';
 import { useLanguage } from '@/app/(app)/i18n';
 import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

export default function BulkNameTagPage() {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('tools.bulk_name_tag.title')}</h1>
        <span className="rounded-full bg-sky-500/20 px-3 py-1 text-xs font-medium text-sky-400">
          v1
        </span>
      </div>

      <p className="text-sm text-slate-400">
        {t('tools.bulk_name_tag.subtitle')}
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
        >
          {t('tools.open_tool')}
        </button>
        <button
          type="button"
          disabled
          className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-500 opacity-50 cursor-not-allowed"
        >
          {t('shell.export')}
        </button>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center">
        <p className="text-slate-400">{t('tools.interface_coming_soon')}</p>
      </div>
    </div>
  );
}
