/**
 * Inlay Offset Calculator Help Content
 */

import { useCallback } from 'react';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

export function InlayOffsetHelp() {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  return (
    <div className="space-y-4 text-sm text-slate-300">
      <div>
        <h3 className="mb-2 font-semibold text-slate-100">{t('inlay_offset_calculator.help.what_is_title')}</h3>
        <p className="text-slate-400">
          {t('inlay_offset_calculator.help.what_is_body')}
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('inlay_offset_calculator.help.why_title')}</h4>
        <p className="text-slate-400 mb-2">{t('inlay_offset_calculator.help.why_body')}</p>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>{t('inlay_offset_calculator.help.why_inlay_piece')}</li>
          <li>{t('inlay_offset_calculator.help.why_base_cutout')}</li>
          <li>{t('inlay_offset_calculator.help.why_formula')}</li>
        </ul>
      </div>

      <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-3">
        <h4 className="mb-1 font-medium text-blue-300">💡 {t('inlay_offset_calculator.help.how_it_works_title')}</h4>
        <div className="space-y-2 text-blue-200/80">
          <p>{t('inlay_offset_calculator.help.how_it_works_1')}</p>
          <p>{t('inlay_offset_calculator.help.how_it_works_2')}</p>
          <p>{t('inlay_offset_calculator.help.how_it_works_3')}</p>
          <p>{t('inlay_offset_calculator.help.how_it_works_4')}</p>
        </div>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('inlay_offset_calculator.help.steps_title')}</h4>
        <ol className="ml-4 list-decimal space-y-1 text-slate-400">
          <li>{t('inlay_offset_calculator.help.step_1')}</li>
          <li>{t('inlay_offset_calculator.help.step_2')}</li>
          <li>{t('inlay_offset_calculator.help.step_3')}</li>
          <li>{t('inlay_offset_calculator.help.step_4')}</li>
          <li>{t('inlay_offset_calculator.help.step_5')}</li>
          <li>{t('inlay_offset_calculator.help.step_6')}</li>
        </ol>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('inlay_offset_calculator.help.kerf_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>{t('inlay_offset_calculator.help.kerf_1')}</li>
          <li>{t('inlay_offset_calculator.help.kerf_2')}</li>
          <li>{t('inlay_offset_calculator.help.kerf_3')}</li>
          <li>{t('inlay_offset_calculator.help.kerf_4')}</li>
          <li>{t('inlay_offset_calculator.help.kerf_5')}</li>
        </ul>
      </div>

      <div className="rounded-lg border border-amber-900 bg-amber-950/20 p-3">
        <h4 className="mb-1 font-medium text-amber-300">⚠️ {t('inlay_offset_calculator.help.tips_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-amber-200/80">
          <li>{t('inlay_offset_calculator.help.tip_1')}</li>
          <li>{t('inlay_offset_calculator.help.tip_2')}</li>
          <li>{t('inlay_offset_calculator.help.tip_3')}</li>
          <li>{t('inlay_offset_calculator.help.tip_4')}</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('inlay_offset_calculator.help.assembly_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>{t('inlay_offset_calculator.help.assembly_1')}</li>
          <li>{t('inlay_offset_calculator.help.assembly_2')}</li>
          <li>{t('inlay_offset_calculator.help.assembly_3')}</li>
          <li>{t('inlay_offset_calculator.help.assembly_4')}</li>
          <li>{t('inlay_offset_calculator.help.assembly_5')}</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('inlay_offset_calculator.help.common_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>{t('inlay_offset_calculator.help.common_1')}</li>
          <li>{t('inlay_offset_calculator.help.common_2')}</li>
          <li>{t('inlay_offset_calculator.help.common_3')}</li>
          <li>{t('inlay_offset_calculator.help.common_4')}</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('inlay_offset_calculator.help.ideas_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>{t('inlay_offset_calculator.help.idea_1')}</li>
          <li>{t('inlay_offset_calculator.help.idea_2')}</li>
          <li>{t('inlay_offset_calculator.help.idea_3')}</li>
          <li>{t('inlay_offset_calculator.help.idea_4')}</li>
          <li>{t('inlay_offset_calculator.help.idea_5')}</li>
        </ul>
      </div>

      <div className="text-xs text-slate-500">
        <p>
          <strong>{t('inlay_offset_calculator.help.pro_tip_label')}</strong> {t('inlay_offset_calculator.help.pro_tip_body')}
        </p>
      </div>
    </div>
  );
}
