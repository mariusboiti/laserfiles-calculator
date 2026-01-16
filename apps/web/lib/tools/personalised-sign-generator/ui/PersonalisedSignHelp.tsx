 'use client';

 import React, { useCallback } from 'react';
 import { useLanguage } from '@/app/(app)/i18n';
 import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

/**
 * Personalised Sign Generator V3 Help Content
 * Usage instructions for creating custom laser-cut signs
 */

export function PersonalisedSignHelp() {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  return (
    <div className="space-y-4 text-sm text-slate-300">
      <div>
        <h3 className="mb-2 font-semibold text-slate-100">{t('personalised_sign.help.v3.title')}</h3>
        <p className="text-slate-400">
          {t('personalised_sign.help.v3.description')}
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('personalised_sign.help.v3.how_to_use.title')}</h4>
        <ol className="ml-4 list-decimal space-y-1 text-slate-400">
          <li>{t('personalised_sign.help.v3.how_to_use.step1')}</li>
          <li>{t('personalised_sign.help.v3.how_to_use.step2')}</li>
          <li>{t('personalised_sign.help.v3.how_to_use.step3')}</li>
          <li>{t('personalised_sign.help.v3.how_to_use.step4')}</li>
          <li>{t('personalised_sign.help.v3.how_to_use.step5')}</li>
          <li>{t('personalised_sign.help.v3.how_to_use.step6')}</li>
          <li>{t('personalised_sign.help.v3.how_to_use.step7')}</li>
          <li>{t('personalised_sign.help.v3.how_to_use.step8')}</li>
        </ol>
      </div>

      <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-3">
        <h4 className="mb-1 font-medium text-blue-300">💡 {t('personalised_sign.help.v3.recommended_sizes.title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-blue-200/80">
          <li>
            <strong>{t('personalised_sign.help.v3.recommended_sizes.small.label')}</strong>: {t('personalised_sign.help.v3.recommended_sizes.small.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.recommended_sizes.medium.label')}</strong>: {t('personalised_sign.help.v3.recommended_sizes.medium.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.recommended_sizes.large.label')}</strong>: {t('personalised_sign.help.v3.recommended_sizes.large.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.recommended_sizes.text_length.label')}</strong>: {t('personalised_sign.help.v3.recommended_sizes.text_length.details')}
          </li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('personalised_sign.help.v3.available_shapes.title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>
            <strong>{t('personalised_sign.help.v3.available_shapes.basic.label')}</strong>: {t('personalised_sign.help.v3.available_shapes.basic.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.available_shapes.arch.label')}</strong>: {t('personalised_sign.help.v3.available_shapes.arch.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.available_shapes.decorative.label')}</strong>: {t('personalised_sign.help.v3.available_shapes.decorative.details')}
          </li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('personalised_sign.help.v3.mounting_options.title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>
            <strong>{t('personalised_sign.help.v3.mounting_options.top_center.label')}</strong>: {t('personalised_sign.help.v3.mounting_options.top_center.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.mounting_options.two_top.label')}</strong>: {t('personalised_sign.help.v3.mounting_options.two_top.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.mounting_options.four_corners.label')}</strong>: {t('personalised_sign.help.v3.mounting_options.four_corners.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.mounting_options.two_sides.label')}</strong>: {t('personalised_sign.help.v3.mounting_options.two_sides.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.mounting_options.keyhole_slots.label')}</strong>: {t('personalised_sign.help.v3.mounting_options.keyhole_slots.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.mounting_options.diameter.label')}</strong>: {t('personalised_sign.help.v3.mounting_options.diameter.details')}
          </li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('personalised_sign.help.v3.text_features.title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>
            <strong>{t('personalised_sign.help.v3.text_features.lines_3.label')}</strong>: {t('personalised_sign.help.v3.text_features.lines_3.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.text_features.custom_fonts.label')}</strong>: {t('personalised_sign.help.v3.text_features.custom_fonts.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.text_features.curved_text.label')}</strong>: {t('personalised_sign.help.v3.text_features.curved_text.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.text_features.alignment.label')}</strong>: {t('personalised_sign.help.v3.text_features.alignment.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.text_features.transform.label')}</strong>: {t('personalised_sign.help.v3.text_features.transform.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.text_features.letter_spacing.label')}</strong>: {t('personalised_sign.help.v3.text_features.letter_spacing.details')}
          </li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('personalised_sign.help.v3.icons_monograms.title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>
            <strong>{t('personalised_sign.help.v3.icons_monograms.icons.label')}</strong>: {t('personalised_sign.help.v3.icons_monograms.icons.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.icons_monograms.placement.label')}</strong>: {t('personalised_sign.help.v3.icons_monograms.placement.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.icons_monograms.monograms.label')}</strong>: {t('personalised_sign.help.v3.icons_monograms.monograms.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.icons_monograms.sizing.label')}</strong>: {t('personalised_sign.help.v3.icons_monograms.sizing.details')}
          </li>
        </ul>
      </div>

      <div className="rounded-lg border border-purple-900 bg-purple-950/20 p-3">
        <h4 className="mb-1 font-medium text-purple-300">✨ {t('personalised_sign.help.v3.ai_sign_generator.title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-purple-200/80">
          <li>{t('personalised_sign.help.v3.ai_sign_generator.item1')}</li>
          <li>{t('personalised_sign.help.v3.ai_sign_generator.item2')}</li>
          <li>{t('personalised_sign.help.v3.ai_sign_generator.item3')}</li>
          <li>{t('personalised_sign.help.v3.ai_sign_generator.item4')}</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('personalised_sign.help.v3.sheet_layout_mode.title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>
            <strong>{t('personalised_sign.help.v3.sheet_layout_mode.multiple_copies.label')}</strong>: {t('personalised_sign.help.v3.sheet_layout_mode.multiple_copies.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.sheet_layout_mode.presets.label')}</strong>: {t('personalised_sign.help.v3.sheet_layout_mode.presets.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.sheet_layout_mode.auto_fill.label')}</strong>: {t('personalised_sign.help.v3.sheet_layout_mode.auto_fill.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.sheet_layout_mode.spacing.label')}</strong>: {t('personalised_sign.help.v3.sheet_layout_mode.spacing.details')}
          </li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('personalised_sign.help.v3.output_options.title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>
            <strong>{t('personalised_sign.help.v3.output_options.both.label')}</strong>: {t('personalised_sign.help.v3.output_options.both.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.output_options.cut_only.label')}</strong>: {t('personalised_sign.help.v3.output_options.cut_only.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.output_options.engrave_only.label')}</strong>: {t('personalised_sign.help.v3.output_options.engrave_only.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.output_options.design_export.label')}</strong>: {t('personalised_sign.help.v3.output_options.design_export.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.output_options.stroke_widths.label')}</strong>: {t('personalised_sign.help.v3.output_options.stroke_widths.details')}
          </li>
        </ul>
      </div>

      <div className="rounded-lg border border-amber-900 bg-amber-950/20 p-3">
        <h4 className="mb-1 font-medium text-amber-300">⚠️ {t('personalised_sign.help.v3.important_notes.title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-amber-200/80">
          <li>{t('personalised_sign.help.v3.important_notes.item1')}</li>
          <li>{t('personalised_sign.help.v3.important_notes.item2')}</li>
          <li>{t('personalised_sign.help.v3.important_notes.item3')}</li>
          <li>{t('personalised_sign.help.v3.important_notes.item4')}</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('personalised_sign.help.v3.material_tips.title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>
            <strong>{t('personalised_sign.help.v3.material_tips.wood.label')}</strong>: {t('personalised_sign.help.v3.material_tips.wood.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.material_tips.acrylic.label')}</strong>: {t('personalised_sign.help.v3.material_tips.acrylic.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.material_tips.cardboard.label')}</strong>: {t('personalised_sign.help.v3.material_tips.cardboard.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.material_tips.kerf.label')}</strong>: {t('personalised_sign.help.v3.material_tips.kerf.details')}
          </li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('personalised_sign.help.v3.laser_settings.title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>
            <strong>{t('personalised_sign.help.v3.laser_settings.cutting.label')}</strong>: {t('personalised_sign.help.v3.laser_settings.cutting.details')}
          </li>
          <li>
            <strong>{t('personalised_sign.help.v3.laser_settings.engraving.label')}</strong>: {t('personalised_sign.help.v3.laser_settings.engraving.details')}
          </li>
          <li>{t('personalised_sign.help.v3.laser_settings.item_set_text_as_layer')}</li>
          <li>{t('personalised_sign.help.v3.laser_settings.item_test_on_scrap')}</li>
        </ul>
      </div>

      <div className="text-xs text-slate-500">
        <p>
          <strong>{t('personalised_sign.help.v3.pro_tip.label')}</strong> {t('personalised_sign.help.v3.pro_tip.text')}
        </p>
      </div>
    </div>
  );
}
