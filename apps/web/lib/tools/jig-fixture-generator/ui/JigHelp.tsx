/**
 * Jig & Fixture Generator Help Content
 */

import { useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

export function JigHelp() {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);
  return (
    <div className="space-y-4 text-sm text-slate-300">
      <div>
        <h3 className="mb-2 font-semibold text-slate-100">{t('jig_fixture.help.what_is_title')}</h3>
        <p className="text-slate-400">{t('jig_fixture.help.what_is_body')}</p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('jig_fixture.help.use_cases_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>{t('jig_fixture.help.use_cases.batch_engraving.label')}</strong>: {t('jig_fixture.help.use_cases.batch_engraving.text')}</li>
          <li><strong>{t('jig_fixture.help.use_cases.assembly_jigs.label')}</strong>: {t('jig_fixture.help.use_cases.assembly_jigs.text')}</li>
          <li><strong>{t('jig_fixture.help.use_cases.production_fixtures.label')}</strong>: {t('jig_fixture.help.use_cases.production_fixtures.text')}</li>
          <li><strong>{t('jig_fixture.help.use_cases.alignment_templates.label')}</strong>: {t('jig_fixture.help.use_cases.alignment_templates.text')}</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('jig_fixture.help.how_to_use_title')}</h4>
        <ol className="ml-4 list-decimal space-y-1 text-slate-400">
          <li>{t('jig_fixture.help.how_to_use.step1')}</li>
          <li>{t('jig_fixture.help.how_to_use.step2')}</li>
          <li>{t('jig_fixture.help.how_to_use.step3')}</li>
          <li>{t('jig_fixture.help.how_to_use.step4')}</li>
          <li>{t('jig_fixture.help.how_to_use.step5')}</li>
          <li>{t('jig_fixture.help.how_to_use.step6')}</li>
        </ol>
      </div>

      <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-3">
        <h4 className="mb-1 font-medium text-blue-300">{t('jig_fixture.help.recommended_settings_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-blue-200/80">
          <li><strong>{t('jig_fixture.help.recommended.margin.label')}</strong>: {t('jig_fixture.help.recommended.margin.text')}</li>
          <li><strong>{t('jig_fixture.help.recommended.gaps.label')}</strong>: {t('jig_fixture.help.recommended.gaps.text')}</li>
          <li><strong>{t('jig_fixture.help.recommended.material.label')}</strong>: {t('jig_fixture.help.recommended.material.text')}</li>
          <li><strong>{t('jig_fixture.help.recommended.numbering.label')}</strong>: {t('jig_fixture.help.recommended.numbering.text')}</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('jig_fixture.help.hole_mode_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>{t('jig_fixture.help.hole_mode.cut.label')}</strong>: {t('jig_fixture.help.hole_mode.cut.text')}</li>
          <li><strong>{t('jig_fixture.help.hole_mode.engrave.label')}</strong>: {t('jig_fixture.help.hole_mode.engrave.text')}</li>
          <li>{t('jig_fixture.help.hole_mode.cut_note')}</li>
          <li>{t('jig_fixture.help.hole_mode.engrave_note')}</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('jig_fixture.help.numbering_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>{t('jig_fixture.help.numbering.item1')}</li>
          <li>{t('jig_fixture.help.numbering.item2')}</li>
          <li>{t('jig_fixture.help.numbering.item3')}</li>
          <li>{t('jig_fixture.help.numbering.item4')}</li>
        </ul>
      </div>

      <div className="rounded-lg border border-amber-900 bg-amber-950/20 p-3">
        <h4 className="mb-1 font-medium text-amber-300">{t('jig_fixture.help.important_tips_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-amber-200/80">
          <li>{t('jig_fixture.help.important_tips.item1')}</li>
          <li>{t('jig_fixture.help.important_tips.item2')}</li>
          <li>{t('jig_fixture.help.important_tips.item3')}</li>
          <li>{t('jig_fixture.help.important_tips.item4')}</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('jig_fixture.help.material_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>{t('jig_fixture.help.material.mdf')}</strong></li>
          <li><strong>{t('jig_fixture.help.material.plywood')}</strong></li>
          <li><strong>{t('jig_fixture.help.material.acrylic')}</strong></li>
          <li>{t('jig_fixture.help.material.avoid')}</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('jig_fixture.help.production_workflow_title')}</h4>
        <ol className="ml-4 list-decimal space-y-1 text-slate-400">
          <li>{t('jig_fixture.help.production_workflow.step1')}</li>
          <li>{t('jig_fixture.help.production_workflow.step2')}</li>
          <li>{t('jig_fixture.help.production_workflow.step3')}</li>
          <li>{t('jig_fixture.help.production_workflow.step4')}</li>
          <li>{t('jig_fixture.help.production_workflow.step5')}</li>
        </ol>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('jig_fixture.help.example_projects_title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>{t('jig_fixture.help.example_projects.item1.label')}</strong>: {t('jig_fixture.help.example_projects.item1.text')}</li>
          <li><strong>{t('jig_fixture.help.example_projects.item2.label')}</strong>: {t('jig_fixture.help.example_projects.item2.text')}</li>
          <li><strong>{t('jig_fixture.help.example_projects.item3.label')}</strong>: {t('jig_fixture.help.example_projects.item3.text')}</li>
          <li><strong>{t('jig_fixture.help.example_projects.item4.label')}</strong>: {t('jig_fixture.help.example_projects.item4.text')}</li>
        </ul>
      </div>

      <div className="text-xs text-slate-500">
        <p>
          <strong>{t('jig_fixture.help.pro_tip_label')}</strong> {t('jig_fixture.help.pro_tip_body')}
        </p>
      </div>
    </div>
  );
}
