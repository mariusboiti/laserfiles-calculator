'use client';

import { useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

export function RoundCoasterHelp() {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  return (
    <div className="space-y-4 text-sm text-slate-300">
      <div>
        <h3 className="mb-2 font-semibold text-slate-100">{t('round_coaster.help.what_is_title')}</h3>
        <p className="text-slate-400">
          {t('round_coaster.help.what_is_body')}
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('round_coaster.help.use_cases_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>
            <strong>{t('round_coaster.help.use_case_coasters_label')}</strong>: {t('round_coaster.help.use_case_coasters_body')}
          </li>
          <li>
            <strong>{t('round_coaster.help.use_case_badges_label')}</strong>: {t('round_coaster.help.use_case_badges_body')}
          </li>
          <li>
            <strong>{t('round_coaster.help.use_case_wedding_label')}</strong>: {t('round_coaster.help.use_case_wedding_body')}
          </li>
          <li>
            <strong>{t('round_coaster.help.use_case_decorative_label')}</strong>: {t('round_coaster.help.use_case_decorative_body')}
          </li>
        </ul>
      </div>

      <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-3">
        <h4 className="mb-1 font-medium text-blue-300">{t('round_coaster.help.recommended_sizes_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-blue-200/80">
          <li>
            <strong>{t('round_coaster.help.recommended_size_standard_label')}</strong>: {t('round_coaster.help.recommended_size_standard_body')}
          </li>
          <li>
            <strong>{t('round_coaster.help.recommended_size_small_label')}</strong>: {t('round_coaster.help.recommended_size_small_body')}
          </li>
          <li>
            <strong>{t('round_coaster.help.recommended_size_large_label')}</strong>: {t('round_coaster.help.recommended_size_large_body')}
          </li>
          <li>
            <strong>{t('round_coaster.help.recommended_size_hex_label')}</strong>: {t('round_coaster.help.recommended_size_hex_body')}
          </li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('round_coaster.help.border_options_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>
            <strong>{t('round_coaster.help.border_option_single_label')}</strong>: {t('round_coaster.help.border_option_single_body')}
          </li>
          <li>
            <strong>{t('round_coaster.help.border_option_double_label')}</strong>: {t('round_coaster.help.border_option_double_body')}
          </li>
          <li>
            <strong>{t('round_coaster.help.border_option_inset_label')}</strong>: {t('round_coaster.help.border_option_inset_body')}
          </li>
          <li>{t('round_coaster.help.border_option_cut_engrave')}</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('round_coaster.help.text_layout_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>
            <strong>{t('round_coaster.help.text_layout_top_label')}</strong>: {t('round_coaster.help.text_layout_top_body')}
          </li>
          <li>
            <strong>{t('round_coaster.help.text_layout_center_label')}</strong>: {t('round_coaster.help.text_layout_center_body')}
          </li>
          <li>
            <strong>{t('round_coaster.help.text_layout_bottom_label')}</strong>: {t('round_coaster.help.text_layout_bottom_body')}
          </li>
          <li>
            <strong>{t('round_coaster.help.text_layout_auto_fit_label')}</strong>: {t('round_coaster.help.text_layout_auto_fit_body')}
          </li>
          <li>{t('round_coaster.help.text_layout_empty_skipped')}</li>
        </ul>
      </div>

      <div className="rounded-lg border border-amber-900 bg-amber-950/20 p-3">
        <h4 className="mb-1 font-medium text-amber-300">{t('round_coaster.help.important_notes_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-amber-200/80">
          <li>{t('round_coaster.help.important_note_long_text')}</li>
          <li>{t('round_coaster.help.important_note_double_border')}</li>
          <li>{t('round_coaster.help.important_note_test_cut')}</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('round_coaster.help.material_tips_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>
            <strong>{t('round_coaster.help.material_tip_wood_label')}</strong>: {t('round_coaster.help.material_tip_wood_body')}
          </li>
          <li>
            <strong>{t('round_coaster.help.material_tip_acrylic_label')}</strong>: {t('round_coaster.help.material_tip_acrylic_body')}
          </li>
          <li>
            <strong>{t('round_coaster.help.material_tip_cork_label')}</strong>: {t('round_coaster.help.material_tip_cork_body')}
          </li>
          <li>
            <strong>{t('round_coaster.help.material_tip_mdf_label')}</strong>: {t('round_coaster.help.material_tip_mdf_body')}
          </li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('round_coaster.help.laser_settings_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>
            <strong>{t('round_coaster.help.laser_setting_cutting_label')}</strong>: {t('round_coaster.help.laser_setting_cutting_body')}
          </li>
          <li>
            <strong>{t('round_coaster.help.laser_setting_engraving_label')}</strong>: {t('round_coaster.help.laser_setting_engraving_body')}
          </li>
          <li>{t('round_coaster.help.laser_setting_layers')}</li>
          <li>{t('round_coaster.help.laser_setting_test')}</li>
        </ul>
      </div>

      <div className="text-xs text-slate-500">
        <p>
          <strong>{t('round_coaster.help.pro_tip_label')}</strong> {t('round_coaster.help.pro_tip_body')}
        </p>
      </div>
    </div>
  );
}
