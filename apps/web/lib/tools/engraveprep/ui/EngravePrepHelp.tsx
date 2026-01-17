/**
 * EngravePrep Help Content
 * Usage instructions for the laser engraving photo preparation tool
 */

import { useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

export function EngravePrepHelp() {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);
  return (
    <div className="space-y-4 text-sm text-slate-300">
      <div>
        <h3 className="mb-2 font-semibold text-slate-100">{t('engraveprep.help.title')}</h3>
        <p className="text-slate-400">
          {t('engraveprep.help.subtitle')}
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('engraveprep.help.step1.title')}</h4>
        <p className="text-slate-400">
          {t('engraveprep.help.step1.body')}
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('engraveprep.help.step2.title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>{t('engraveprep.help.step2.item1.label')}</strong> {t('engraveprep.help.step2.item1.text')}</li>
          <li><strong>{t('engraveprep.help.step2.item2.label')}</strong> {t('engraveprep.help.step2.item2.text')}</li>
          <li><strong>{t('engraveprep.help.step2.item3.label')}</strong> {t('engraveprep.help.step2.item3.text')}</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('engraveprep.help.step3.title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>{t('engraveprep.help.step3.item1.label')}</strong> {t('engraveprep.help.step3.item1.text')}</li>
          <li><strong>{t('engraveprep.help.step3.item2.label')}</strong> {t('engraveprep.help.step3.item2.text')}</li>
          <li><strong>{t('engraveprep.help.step3.item3.label')}</strong> {t('engraveprep.help.step3.item3.text')}</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('engraveprep.help.step4.title')}</h4>
        <p className="text-slate-400">
          {t('engraveprep.help.step4.body')}
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">{t('engraveprep.help.step5.title')}</h4>
        <p className="text-slate-400">
          {t('engraveprep.help.step5.body')}
        </p>
      </div>

      <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-3">
        <h4 className="mb-1 font-medium text-blue-300">{t('engraveprep.help.tips.title')}</h4>
        <ul className="ml-4 list-disc space-y-1 text-blue-200/80">
          <li><strong>{t('engraveprep.help.tips.item1.label')}</strong> {t('engraveprep.help.tips.item1.text')}</li>
          <li>{t('engraveprep.help.tips.item2')}</li>
          <li>{t('engraveprep.help.tips.item3')}</li>
          <li>{t('engraveprep.help.tips.item4')}</li>
          <li><strong>{t('engraveprep.help.tips.item5.label')}</strong> {t('engraveprep.help.tips.item5.text')}</li>
        </ul>
      </div>

      <div className="text-xs text-slate-500">
        <p>
          <strong>{t('engraveprep.help.recommended.label')}</strong> {t('engraveprep.help.recommended.body')}
        </p>
      </div>
    </div>
  );
}
