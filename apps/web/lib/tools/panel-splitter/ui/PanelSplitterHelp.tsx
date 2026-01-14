/**
 * Panel Splitter Help Content
 * Usage instructions for splitting large SVGs into laser-cuttable tiles
 */

import { useCallback } from 'react';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

export function PanelSplitterHelp() {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  return (
    <div className="space-y-4 text-sm text-slate-300">
      <div>
        <h3 className="mb-2 font-semibold text-slate-100">{t('panel_splitter.help.what_is_title')}</h3>
        <p className="text-slate-400">
          {t('panel_splitter.help.what_is_body')}
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('panel_splitter.help.how_to_use_title')}</h4>
        <ol className="ml-4 list-decimal space-y-1 text-slate-400">
          <li>{t('panel_splitter.help.how_to_use.step1')}</li>
          <li>{t('panel_splitter.help.how_to_use.step2')}</li>
          <li>{t('panel_splitter.help.how_to_use.step3')}</li>
          <li>{t('panel_splitter.help.how_to_use.step4')}</li>
          <li>{t('panel_splitter.help.how_to_use.step5')}</li>
        </ol>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('panel_splitter.help.assembly_tips_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>{t('panel_splitter.help.assembly_tips.tip1')}</li>
          <li>{t('panel_splitter.help.assembly_tips.tip2')}</li>
          <li>{t('panel_splitter.help.assembly_tips.tip3')}</li>
          <li>{t('panel_splitter.help.assembly_tips.tip4')}</li>
          <li>{t('panel_splitter.help.assembly_tips.tip5')}</li>
        </ul>
      </div>

      <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-3">
        <h4 className="mb-1 font-medium text-blue-300">💡 {t('panel_splitter.help.recommended_settings_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-blue-200/80">
          <li><strong>{t('panel_splitter.help.recommended.overlap_label')}</strong>: {t('panel_splitter.help.recommended.overlap_value')}</li>
          <li><strong>{t('panel_splitter.help.recommended.margin_label')}</strong>: {t('panel_splitter.help.recommended.margin_value')}</li>
          <li><strong>{t('panel_splitter.help.recommended.bed_size_label')}</strong>: {t('panel_splitter.help.recommended.bed_size_value')}</li>
          <li>{t('panel_splitter.help.recommended.presets')}</li>
        </ul>
      </div>

      <div className="rounded-lg border border-amber-900 bg-amber-950/20 p-3">
        <h4 className="mb-1 font-medium text-amber-300">⚠️ {t('panel_splitter.help.important_notes_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-amber-200/80">
          <li>{t('panel_splitter.help.important.note1')}</li>
          <li>{t('panel_splitter.help.important.note2')}</li>
          <li>{t('panel_splitter.help.important.note3')}</li>
          <li>{t('panel_splitter.help.important.note4')}</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('panel_splitter.help.ideal_for_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>{t('panel_splitter.help.ideal.wall_art_label')}</strong>: {t('panel_splitter.help.ideal.wall_art_value')}</li>
          <li><strong>{t('panel_splitter.help.ideal.mandalas_label')}</strong>: {t('panel_splitter.help.ideal.mandalas_value')}</li>
          <li><strong>{t('panel_splitter.help.ideal.maps_label')}</strong>: {t('panel_splitter.help.ideal.maps_value')}</li>
          <li><strong>{t('panel_splitter.help.ideal.signage_label')}</strong>: {t('panel_splitter.help.ideal.signage_value')}</li>
          <li><strong>{t('panel_splitter.help.ideal.arch_models_label')}</strong>: {t('panel_splitter.help.ideal.arch_models_value')}</li>
        </ul>
      </div>

      <div className="text-xs text-slate-500">
        <p>
          <strong>{t('panel_splitter.help.pro_tip_label')}</strong> {t('panel_splitter.help.pro_tip_body')}
        </p>
      </div>
    </div>
  );
}
