/**
 * Bulk Name Tags Help Content
 * Usage instructions for generating multiple name tags
 */

import { useCallback } from 'react';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

export function BulkNameTagsHelp() {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  return (
    <div className="space-y-4 text-sm text-slate-300">
      <div>
        <h3 className="mb-2 font-semibold text-slate-100">{t('bulk_name_tags.help.what_is_title')}</h3>
        <p className="text-slate-400">
          {t('bulk_name_tags.help.what_is_body')}
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('bulk_name_tags.help.how_to_title')}</h4>
        <ol className="ml-4 list-decimal space-y-1 text-slate-400">
          <li>{t('bulk_name_tags.help.how_to_step_1')}</li>
          <li>{t('bulk_name_tags.help.how_to_step_2')}</li>
          <li>{t('bulk_name_tags.help.how_to_step_3')}</li>
          <li>{t('bulk_name_tags.help.how_to_step_4')}</li>
          <li>{t('bulk_name_tags.help.how_to_step_5')}</li>
        </ol>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('bulk_name_tags.help.adding_names_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>{t('bulk_name_tags.help.adding_names_csv')}</li>
          <li>{t('bulk_name_tags.help.adding_names_paste')}</li>
          <li>{t('bulk_name_tags.help.adding_names_cleanup')}</li>
          <li>{t('bulk_name_tags.help.adding_names_limit')}</li>
        </ul>
      </div>

      <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-3">
        <h4 className="mb-1 font-medium text-blue-300">💡 {t('bulk_name_tags.help.recommended_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-blue-200/80">
          <li>{t('bulk_name_tags.help.recommended_tag_size')}</li>
          <li>{t('bulk_name_tags.help.recommended_font_size')}</li>
          <li>{t('bulk_name_tags.help.recommended_spacing')}</li>
          <li>{t('bulk_name_tags.help.recommended_margin')}</li>
        </ul>
      </div>

      <div className="rounded-lg border border-amber-900 bg-amber-950/20 p-3">
        <h4 className="mb-1 font-medium text-amber-300">⚠️ {t('bulk_name_tags.help.important_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-amber-200/80">
          <li>{t('bulk_name_tags.help.important_1')}</li>
          <li>{t('bulk_name_tags.help.important_2')}</li>
          <li>{t('bulk_name_tags.help.important_3')}</li>
          <li>{t('bulk_name_tags.help.important_4')}</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('bulk_name_tags.help.export_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>{t('bulk_name_tags.help.export_zip')}</li>
          <li>{t('bulk_name_tags.help.export_sheet')}</li>
          <li>{t('bulk_name_tags.help.export_naming')}</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('bulk_name_tags.help.production_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>{t('bulk_name_tags.help.production_1')}</li>
          <li>{t('bulk_name_tags.help.production_2')}</li>
          <li>{t('bulk_name_tags.help.production_3')}</li>
          <li>{t('bulk_name_tags.help.production_4')}</li>
          <li>{t('bulk_name_tags.help.production_5')}</li>
        </ul>
      </div>

      <div className="text-xs text-slate-500">
        <p>
          <strong>{t('bulk_name_tags.help.pro_tip_label')}</strong> {t('bulk_name_tags.help.pro_tip_body')}
        </p>
      </div>
    </div>
  );
}
