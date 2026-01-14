'use client';

import { useCallback } from 'react';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

export default function HelpContent() {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">{t('help.page_title')}</h1>
        <p className="mt-2 text-lg text-slate-400">{t('help.page_subtitle')}</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-100">{t('help.what_is_title')}</h2>
        <p className="text-slate-300">{t('help.what_is_p1')}</p>
        <p className="text-slate-300">{t('help.what_is_p2')}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-100">{t('help.compatible_software_title')}</h2>
        <p className="text-slate-300">{t('help.compatible_software_intro')}</p>
        <ul className="ml-6 list-disc space-y-2 text-slate-300">
          <li>
            <strong className="text-slate-200">LightBurn</strong> – {t('help.software.lightburn_desc')}
          </li>
          <li>
            <strong className="text-slate-200">RDWorks</strong> – {t('help.software.rdworks_desc')}
          </li>
          <li>
            <strong className="text-slate-200">LaserGRBL</strong> – {t('help.software.lasergrbl_desc')}
          </li>
          <li>
            <strong className="text-slate-200">K40 Whisperer</strong> – {t('help.software.k40_desc')}
          </li>
          <li>
            <strong className="text-slate-200">Inkscape</strong> – {t('help.software.inkscape_desc')}
          </li>
          <li>
            <strong className="text-slate-200">Adobe Illustrator</strong> – {t('help.software.illustrator_desc')}
          </li>
        </ul>
        <div className="rounded-lg border border-blue-800 bg-blue-950/20 p-4">
          <p className="text-sm text-blue-200">
            <strong>💡 {t('help.tip_label')}</strong> {t('help.tip_body')}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-100">{t('help.general_tips_title')}</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-200">{t('help.kerf_title')}</h3>
            <p className="mt-2 text-slate-300">
              <strong>Kerf</strong> {t('help.kerf_definition')} {t('help.kerf_typical_values_label')}
            </p>
            <ul className="ml-6 mt-2 list-disc space-y-1 text-slate-300">
              <li>{t('help.kerf.value_1')}</li>
              <li>{t('help.kerf.value_2')}</li>
              <li>{t('help.kerf.value_3')}</li>
              <li>{t('help.kerf.value_4')}</li>
            </ul>
            <p className="mt-2 text-slate-300">{t('help.kerf_note')}</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-200">{t('help.test_cuts_title')}</h3>
            <p className="mt-2 text-slate-300">{t('help.test_cuts_intro')}</p>
            <ul className="ml-6 mt-2 list-disc space-y-1 text-slate-300">
              <li>{t('help.test_cuts.item_1')}</li>
              <li>{t('help.test_cuts.item_2')}</li>
              <li>{t('help.test_cuts.item_3')}</li>
              <li>{t('help.test_cuts.item_4')}</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-200">{t('help.material_recommendations_title')}</h3>
            <ul className="ml-6 mt-2 list-disc space-y-1 text-slate-300">
              <li>
                <strong>{t('help.material.plywood_label')}</strong> {t('help.material.plywood_desc')}
              </li>
              <li>
                <strong>{t('help.material.mdf_label')}</strong> {t('help.material.mdf_desc')}
              </li>
              <li>
                <strong>{t('help.material.acrylic_label')}</strong> {t('help.material.acrylic_desc')}
              </li>
              <li>
                <strong>{t('help.material.cardstock_label')}</strong> {t('help.material.cardstock_desc')}
              </li>
              <li>
                <strong>{t('help.material.bamboo_label')}</strong> {t('help.material.bamboo_desc')}
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-200">{t('help.engraving_vs_cutting_title')}</h3>
            <p className="mt-2 text-slate-300">{t('help.engraving_vs_cutting_intro')}</p>
            <ul className="ml-6 mt-2 list-disc space-y-1 text-slate-300">
              <li>
                <strong>{t('help.path_cutting_label')}</strong> {t('help.path_cutting_desc')}
              </li>
              <li>
                <strong>{t('help.path_engraving_label')}</strong> {t('help.path_engraving_desc')}
              </li>
            </ul>
            <p className="mt-2 text-slate-300">{t('help.lightburn_layers_tip')}</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-100">{t('help.tool_categories_title')}</h2>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <h3 className="font-semibold text-slate-200">{t('help.category.boxes_structures_title')}</h3>
            <p className="mt-1 text-sm text-slate-400">{t('help.category.boxes_structures_desc')}</p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <h3 className="font-semibold text-slate-200">{t('help.category.layout_production_title')}</h3>
            <p className="mt-1 text-sm text-slate-400">{t('help.category.layout_production_desc')}</p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <h3 className="font-semibold text-slate-200">{t('help.category.personalization_title')}</h3>
            <p className="mt-1 text-sm text-slate-400">{t('help.category.personalization_desc')}</p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <h3 className="font-semibold text-slate-200">{t('help.category.utilities_title')}</h3>
            <p className="mt-1 text-sm text-slate-400">{t('help.category.utilities_desc')}</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-100">{t('help.getting_started_title')}</h2>
        <ol className="ml-6 list-decimal space-y-3 text-slate-300">
          <li>
            <strong className="text-slate-200">{t('help.getting_started.step_1_bold')}</strong> {t('help.getting_started.step_1_after')}{' '}
            <a href="/studio/tools" className="text-sky-400 hover:text-sky-300">
              {t('help.getting_started.tools_page_link')}
            </a>
          </li>
          <li>
            <strong className="text-slate-200">{t('help.getting_started.step_2_bold')}</strong> {t('help.getting_started.step_2_after')}
          </li>
          <li>
            <strong className="text-slate-200">{t('help.getting_started.step_3_bold')}</strong> {t('help.getting_started.step_3_after')}
          </li>
          <li>
            <strong className="text-slate-200">{t('help.getting_started.step_4_bold')}</strong> {t('help.getting_started.step_4_after')}
          </li>
          <li>
            <strong className="text-slate-200">{t('help.getting_started.step_5_bold')}</strong> {t('help.getting_started.step_5_after')}
          </li>
          <li>
            <strong className="text-slate-200">{t('help.getting_started.step_6_bold')}</strong> {t('help.getting_started.step_6_after')}
          </li>
          <li>
            <strong className="text-slate-200">{t('help.getting_started.step_7_bold')}</strong> {t('help.getting_started.step_7_after')}
          </li>
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-100">{t('help.need_more_help_title')}</h2>
        <p className="text-slate-300">
          {t('help.need_more_help_p1_before')} <strong>{t('help.need_more_help_help_button')}</strong> {t('help.need_more_help_p1_after')}
        </p>
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-sm text-slate-300">{t('help.support_box_text')}</p>
        </div>
      </section>
    </div>
  );
}
