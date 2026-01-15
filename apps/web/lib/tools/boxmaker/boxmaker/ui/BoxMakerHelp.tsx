/**
 * BoxMaker Help Content
 * Assembly tips, kerf guidance, and mode explanations
 */

import { useCallback } from 'react';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

export function BoxMakerHelp() {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  return (
    <div className="space-y-4 text-sm text-slate-300">
      <div>
        <h3 className="mb-2 font-semibold text-slate-100">{t('boxmaker.help.modes_title')}</h3>
        <p className="text-slate-400">
          {t('boxmaker.help.modes_body')}
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('boxmaker.help.simple_title')}</h4>
        <p className="text-slate-400">
          {t('boxmaker.help.simple_body')}
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('boxmaker.help.hinged_title')}</h4>
        <p className="text-slate-400">
          {t('boxmaker.help.hinged_body')}
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('boxmaker.help.drawer_title')}</h4>
        <p className="text-slate-400">
          {t('boxmaker.help.drawer_body')}
        </p>
      </div>

      <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-3">
        <h4 className="mb-1 font-medium text-blue-300">🔧 {t('boxmaker.help.assembly_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-blue-200/80">
          <li>{t('boxmaker.help.assembly_1')}</li>
          <li>{t('boxmaker.help.assembly_2')}</li>
          <li>{t('boxmaker.help.assembly_3')}</li>
          <li>{t('boxmaker.help.assembly_4')}</li>
          <li>{t('boxmaker.help.assembly_5')}</li>
        </ul>
      </div>

      <div className="rounded-lg border border-amber-900 bg-amber-950/20 p-3">
        <h4 className="mb-1 font-medium text-amber-300">📏 {t('boxmaker.help.kerf_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-amber-200/80">
          <li>{t('boxmaker.help.kerf_1')}</li>
          <li>{t('boxmaker.help.kerf_2')}</li>
          <li>{t('boxmaker.help.kerf_3')}</li>
          <li>{t('boxmaker.help.kerf_4')}</li>
          <li>{t('boxmaker.help.kerf_5')}</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">📐 {t('boxmaker.help.thickness_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>{t('boxmaker.help.thickness_1')}</li>
          <li>{t('boxmaker.help.thickness_2')}</li>
          <li>{t('boxmaker.help.thickness_3')}</li>
          <li>{t('boxmaker.help.thickness_4')}</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">🎯 {t('boxmaker.help.starting_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>{t('boxmaker.help.starting_1')}</li>
          <li>{t('boxmaker.help.starting_2')}</li>
          <li>{t('boxmaker.help.starting_3')}</li>
          <li>{t('boxmaker.help.starting_4')}</li>
        </ul>
      </div>

      <div className="text-xs text-slate-500">
        <p>
          <strong>{t('boxmaker.help.pro_tip_label')}</strong> {t('boxmaker.help.pro_tip_body')}
        </p>
      </div>
    </div>
  );
}
