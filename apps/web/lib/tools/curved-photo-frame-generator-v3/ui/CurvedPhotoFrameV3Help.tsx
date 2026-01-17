/**
 * Curved Photo Frame Generator V2 Help Component
 */

import { useLanguage } from '@/lib/i18n/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

export function CurvedPhotoFrameV3Help() {
  const { locale } = useLanguage();
  const t = getStudioTranslation(locale);

  return (
    <div className="prose prose-invert max-w-none">
      <h2>{t('curved_frame.v3.help.title')}</h2>
      <p>
        {t('curved_frame.v3.help.intro.p1')}
        {t('curved_frame.v3.help.intro.p2')}
      </p>

      <h3>{t('curved_frame.v3.help.features.title')}</h3>
      <ul>
        <li>
          <strong>{t('curved_frame.v3.help.features.ai_prep.strong')}</strong> {t('curved_frame.v3.help.features.ai_prep.text')}
        </li>
        <li>
          <strong>{t('curved_frame.v3.help.features.smart_crop.strong')}</strong> {t('curved_frame.v3.help.features.smart_crop.text')}
        </li>
        <li>
          <strong>{t('curved_frame.v3.help.features.wood_presets.strong')}</strong> {t('curved_frame.v3.help.features.wood_presets.text')}
        </li>
        <li>
          <strong>{t('curved_frame.v3.help.features.curved_design.strong')}</strong> {t('curved_frame.v3.help.features.curved_design.text')}
        </li>
        <li>
          <strong>{t('curved_frame.v3.help.features.stand_types.strong')}</strong> {t('curved_frame.v3.help.features.stand_types.text')}
        </li>
      </ul>

      <h3>{t('curved_frame.v3.help.workflow.title')}</h3>
      <ol>
        <li>
          <strong>{t('curved_frame.v3.help.workflow.step1.strong')}</strong> {t('curved_frame.v3.help.workflow.step1.text')}
        </li>
        <li>
          <strong>{t('curved_frame.v3.help.workflow.step2.strong')}</strong> {t('curved_frame.v3.help.workflow.step2.text')}
        </li>
        <li>
          <strong>{t('curved_frame.v3.help.workflow.step3.strong')}</strong> {t('curved_frame.v3.help.workflow.step3.text')}
        </li>
        <li>
          <strong>{t('curved_frame.v3.help.workflow.step4.strong')}</strong> {t('curved_frame.v3.help.workflow.step4.text')}
        </li>
        <li>
          <strong>{t('curved_frame.v3.help.workflow.step5.strong')}</strong> {t('curved_frame.v3.help.workflow.step5.text')}
        </li>
      </ol>

      <h3>{t('curved_frame.v3.help.wood_presets.title')}</h3>
      <ul>
        <li>
          <strong>{t('curved_frame.v3.help.wood_presets.birch.strong')}</strong> {t('curved_frame.v3.help.wood_presets.birch.text')}
        </li>
        <li>
          <strong>{t('curved_frame.v3.help.wood_presets.basswood.strong')}</strong> {t('curved_frame.v3.help.wood_presets.basswood.text')}
        </li>
        <li>
          <strong>{t('curved_frame.v3.help.wood_presets.walnut.strong')}</strong> {t('curved_frame.v3.help.wood_presets.walnut.text')}
        </li>
        <li>
          <strong>{t('curved_frame.v3.help.wood_presets.acrylic.strong')}</strong> {t('curved_frame.v3.help.wood_presets.acrylic.text')}
        </li>
      </ul>

      <h3>{t('curved_frame.v3.help.layer_colors.title')}</h3>
      <ul>
        <li>
          <strong style={{ color: '#ef4444' }}>{t('curved_frame.v3.help.layer_colors.red.strong')}</strong> {t('curved_frame.v3.help.layer_colors.red.text')}
        </li>
        <li>
          <strong>{t('curved_frame.v3.help.layer_colors.black.strong')}</strong> {t('curved_frame.v3.help.layer_colors.black.text')}
        </li>
        <li>
          <strong style={{ color: '#3b82f6' }}>{t('curved_frame.v3.help.layer_colors.blue.strong')}</strong> {t('curved_frame.v3.help.layer_colors.blue.text')}
        </li>
      </ul>

      <h3>{t('curved_frame.v3.help.tips.title')}</h3>
      <ul>
        <li>{t('curved_frame.v3.help.tips.li1')}</li>
        <li>{t('curved_frame.v3.help.tips.li2')}</li>
        <li>{t('curved_frame.v3.help.tips.li3')}</li>
        <li>
          {t('curved_frame.v3.help.tips.li4')}
        </li>
        <li>{t('curved_frame.v3.help.tips.li5')}</li>
      </ul>

      <h3>{t('curved_frame.v3.help.free_vs_pro.title')}</h3>
      <p>
        <strong>{t('curved_frame.v3.help.free_vs_pro.free.strong')}</strong> {t('curved_frame.v3.help.free_vs_pro.free.text')}
      </p>
      <p>
        <strong>{t('curved_frame.v3.help.free_vs_pro.pro.strong')}</strong> {t('curved_frame.v3.help.free_vs_pro.pro.text')}
      </p>

      <h3>{t('curved_frame.v3.help.technical.title')}</h3>
      <ul>
        <li>{t('curved_frame.v3.help.technical.li1')}</li>
        <li>{t('curved_frame.v3.help.technical.li2')}</li>
        <li>
          {t('curved_frame.v3.help.technical.li3')}
        </li>
        <li>{t('curved_frame.v3.help.technical.li4')}</li>
      </ul>
    </div>
  );
}
