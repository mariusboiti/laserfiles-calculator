 'use client';

 import React, { useCallback } from 'react';
 import { useLanguage } from '@/app/(app)/i18n';
 import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

/**
 * Personalised Sign Generator V3 PRO Help Content
 * Usage instructions for layer-based sign designer
 */

export function PersonalisedSignHelpPro() {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  return (
    <div className="space-y-4 text-sm text-slate-300">
      <div>
        <h3 className="mb-2 font-semibold text-slate-100">{t('personalised_sign.pro.help.title')}</h3>
        <p className="text-slate-400">
          {t('personalised_sign.pro.help.description')}
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('personalised_sign.pro.help.how_to_use.title')}</h4>
        <ol className="ml-4 list-decimal space-y-1 text-slate-400">
          <li>{t('personalised_sign.pro.help.how_to_use.step1')}</li>
          <li>{t('personalised_sign.pro.help.how_to_use.step2')}</li>
          <li>{t('personalised_sign.pro.help.how_to_use.step3')}</li>
          <li>{t('personalised_sign.pro.help.how_to_use.step4')}</li>
          <li>{t('personalised_sign.pro.help.how_to_use.step5')}</li>
        </ol>
      </div>

      <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-3">
        <h4 className="mb-1 font-medium text-blue-300">📐 {t('personalised_sign.pro.help.text_modes.title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-blue-200/80">
          <li>
            <strong>{t('personalised_sign.pro.help.text_modes.engrave_filled.label')}</strong>: {t('personalised_sign.pro.help.text_modes.engrave_filled.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.pro.help.text_modes.cut_outline.label')}</strong>: {t('personalised_sign.pro.help.text_modes.cut_outline.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.pro.help.text_modes.both.label')}</strong>: {t('personalised_sign.pro.help.text_modes.both.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.pro.help.text_modes.outline_offset.label')}</strong>: {t('personalised_sign.pro.help.text_modes.outline_offset.details')}
          </li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('personalised_sign.pro.help.layers_system.title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>
            <strong>{t('personalised_sign.pro.help.layers_system.base.label')}</strong>: {t('personalised_sign.pro.help.layers_system.base.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.pro.help.layers_system.cut.label')}</strong>: {t('personalised_sign.pro.help.layers_system.cut.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.pro.help.layers_system.engrave.label')}</strong>: {t('personalised_sign.pro.help.layers_system.engrave.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.pro.help.layers_system.outline.label')}</strong>: {t('personalised_sign.pro.help.layers_system.outline.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.pro.help.layers_system.guide.label')}</strong>: {t('personalised_sign.pro.help.layers_system.guide.details')}
          </li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('personalised_sign.pro.help.layer_controls.title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>
            <strong>{t('personalised_sign.pro.help.layer_controls.eye_icon.label')}</strong>: {t('personalised_sign.pro.help.layer_controls.eye_icon.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.pro.help.layer_controls.lock_icon.label')}</strong>: {t('personalised_sign.pro.help.layer_controls.lock_icon.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.pro.help.layer_controls.opacity.label')}</strong>: {t('personalised_sign.pro.help.layer_controls.opacity.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.pro.help.layer_controls.export_toggle.label')}</strong>: {t('personalised_sign.pro.help.layer_controls.export_toggle.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.pro.help.layer_controls.reorder.label')}</strong>: {t('personalised_sign.pro.help.layer_controls.reorder.details')}
          </li>
        </ul>
      </div>

      <div className="rounded-lg border border-purple-900 bg-purple-950/20 p-3">
        <h4 className="mb-1 font-medium text-purple-300">✨ {t('personalised_sign.pro.help.ai_generation.title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-purple-200/80">
          <li>
            <strong>{t('personalised_sign.pro.help.ai_generation.engraving_sketch.label')}</strong>: {t('personalised_sign.pro.help.ai_generation.engraving_sketch.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.pro.help.ai_generation.shape_silhouette.label')}</strong>: {t('personalised_sign.pro.help.ai_generation.shape_silhouette.details')}
          </li>
          <li>{t('personalised_sign.pro.help.ai_generation.keep_prompts_simple')}</li>
          <li>{t('personalised_sign.pro.help.ai_generation.ai_results_added')}</li>
          <li>{t('personalised_sign.pro.help.ai_generation.detail_level_controls')}</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('personalised_sign.pro.help.shared_fonts.title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>{t('personalised_sign.pro.help.shared_fonts.item1')}</li>
          <li>{t('personalised_sign.pro.help.shared_fonts.item2')}</li>
          <li>{t('personalised_sign.pro.help.shared_fonts.item3')}</li>
          <li>{t('personalised_sign.pro.help.shared_fonts.item4')}</li>
        </ul>
      </div>

      <div className="rounded-lg border border-amber-900 bg-amber-950/20 p-3">
        <h4 className="mb-1 font-medium text-amber-300">⚠️ {t('personalised_sign.pro.help.important_notes.title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-amber-200/80">
          <li>{t('personalised_sign.pro.help.important_notes.item1')}</li>
          <li>{t('personalised_sign.pro.help.important_notes.item2')}</li>
          <li>{t('personalised_sign.pro.help.important_notes.item3')}</li>
          <li>{t('personalised_sign.pro.help.important_notes.item4')}</li>
          <li>{t('personalised_sign.pro.help.important_notes.item5')}</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('personalised_sign.pro.help.export_format.title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>{t('personalised_sign.pro.help.export_format.item1')}</li>
          <li>{t('personalised_sign.pro.help.export_format.item2')}</li>
          <li>{t('personalised_sign.pro.help.export_format.item3')}</li>
          <li>{t('personalised_sign.pro.help.export_format.item4')}</li>
          <li>{t('personalised_sign.pro.help.export_format.item5')}</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('personalised_sign.pro.help.laser_settings_tip.title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>
            <strong>{t('personalised_sign.pro.help.laser_settings_tip.cut_black.label')}</strong>: {t('personalised_sign.pro.help.laser_settings_tip.cut_black.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.pro.help.laser_settings_tip.engrave_red.label')}</strong>: {t('personalised_sign.pro.help.laser_settings_tip.engrave_red.details')}
          </li>
          <li>{t('personalised_sign.pro.help.laser_settings_tip.item_import_svg')}</li>
          <li>{t('personalised_sign.pro.help.laser_settings_tip.item_cut_last')}</li>
        </ul>
      </div>

      <div className="text-xs text-slate-500">
        <p>
          <strong>{t('personalised_sign.pro.help.pro_tip.label')}</strong> {t('personalised_sign.pro.help.pro_tip.text')}
        </p>
      </div>
    </div>
  );
}
