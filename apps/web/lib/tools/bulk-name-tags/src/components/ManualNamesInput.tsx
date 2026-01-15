import { useMemo, useCallback } from 'react';
import type { NameRecord } from '../types';
import { parseManualNames } from '../utils/manualNamesUtils';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

interface ManualNamesInputProps {
  value: string;
  onChange: (value: string) => void;
  onNamesChange: (names: NameRecord[]) => void;
}

export function ManualNamesInput({ value, onChange, onNamesChange }: ManualNamesInputProps) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const parsed = useMemo(() => parseManualNames(value), [value]);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="text-xl font-semibold text-slate-100 mb-2">{t('bulk_name_tags.manual.step_title')}</h2>
      <p className="text-sm text-slate-400 mb-4">
        {t('bulk_name_tags.manual.desc')}
      </p>

      <textarea
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next);
          onNamesChange(parseManualNames(next));
        }}
        rows={8}
        placeholder={t('bulk_name_tags.manual.placeholder')}
        className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono text-sm"
      />

      <div className="mt-3 text-sm text-slate-300 bg-slate-800/60 p-3 rounded">
        {t('bulk_name_tags.manual.parsed_count').replace('{count}', String(parsed.length))}
      </div>
    </div>
  );
}
