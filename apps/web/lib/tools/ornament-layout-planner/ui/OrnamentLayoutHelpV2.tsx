/**
 * Help component for Ornament Layout Planner V2
 */

import { useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

export function OrnamentLayoutHelpV2() {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <h2>{t('ornament_layout.help.v2.title')}</h2>
      
      <h3>{t('ornament_layout.help.v2.overview.title')}</h3>
      <p>
        {t('ornament_layout.help.v2.overview.p1')}
        {t('ornament_layout.help.v2.overview.p2')}
      </p>

      <h3>{t('ornament_layout.help.v2.templates.title')}</h3>
      <ul>
        <li><strong>{t('ornament_layout.help.v2.templates.li1.strong')}</strong> - {t('ornament_layout.help.v2.templates.li1.text')}</li>
        <li><strong>{t('ornament_layout.help.v2.templates.li2.strong')}</strong> - {t('ornament_layout.help.v2.templates.li2.text')}</li>
        <li><strong>{t('ornament_layout.help.v2.templates.li3.strong')}</strong> - {t('ornament_layout.help.v2.templates.li3.text')}</li>
        <li><strong>{t('ornament_layout.help.v2.templates.li4.strong')}</strong> - {t('ornament_layout.help.v2.templates.li4.text')}</li>
      </ul>

      <h3>{t('ornament_layout.help.v2.layout_modes.title')}</h3>
      
      <h4>{t('ornament_layout.help.v2.grid_mode.title')}</h4>
      <ul>
        <li>{t('ornament_layout.help.v2.grid_mode.li1')}</li>
        <li>{t('ornament_layout.help.v2.grid_mode.li2')}</li>
        <li><strong>{t('ornament_layout.help.v2.grid_mode.li3.strong')}</strong> - {t('ornament_layout.help.v2.grid_mode.li3.text')}</li>
        <li><strong>{t('ornament_layout.help.v2.grid_mode.li4.strong')}</strong> - {t('ornament_layout.help.v2.grid_mode.li4.text')}</li>
      </ul>

      <h4>{t('ornament_layout.help.v2.pack_mode.title')}</h4>
      <ul>
        <li>{t('ornament_layout.help.v2.pack_mode.li1')}</li>
        <li>{t('ornament_layout.help.v2.pack_mode.li2')}</li>
        <li><strong>{t('ornament_layout.help.v2.pack_mode.li3.strong')}</strong> - {t('ornament_layout.help.v2.pack_mode.li3.text')}</li>
        <li><strong>{t('ornament_layout.help.v2.pack_mode.li4.strong')}</strong> - {t('ornament_layout.help.v2.pack_mode.li4.text')}</li>
        <li>{t('ornament_layout.help.v2.pack_mode.li5')}</li>
      </ul>

      <h3>{t('ornament_layout.help.v2.multi_sheet_export.title')}</h3>
      <ul>
        <li>{t('ornament_layout.help.v2.multi_sheet_export.li1')}</li>
        <li>{t('ornament_layout.help.v2.multi_sheet_export.li2')}</li>
        <li><strong>{t('ornament_layout.help.v2.multi_sheet_export.li3.strong')}</strong> - {t('ornament_layout.help.v2.multi_sheet_export.li3.text')}</li>
        <li><strong>{t('ornament_layout.help.v2.multi_sheet_export.li4.strong')}</strong> - {t('ornament_layout.help.v2.multi_sheet_export.li4.text')}</li>
      </ul>

      <h3>{t('ornament_layout.help.v2.labels_serial.title')}</h3>
      <ul>
        <li><strong>{t('ornament_layout.help.v2.labels_serial.li1.strong')}</strong> - {t('ornament_layout.help.v2.labels_serial.li1.text')}</li>
        <li><strong>{t('ornament_layout.help.v2.labels_serial.li2.strong')}</strong> - {t('ornament_layout.help.v2.labels_serial.li2.text')}</li>
        <li><strong>{t('ornament_layout.help.v2.labels_serial.li3.strong')}</strong>
          <ul>
            <li>{t('ornament_layout.help.v2.labels_serial.li3.sub1')}</li>
            <li>{t('ornament_layout.help.v2.labels_serial.li3.sub2')}</li>
            <li>{t('ornament_layout.help.v2.labels_serial.li3.sub3')}</li>
          </ul>
        </li>
        <li>⚠️ <em>{t('ornament_layout.help.v2.labels_serial.note')}</em></li>
      </ul>

      <h3>{t('ornament_layout.help.v2.production_tips.title')}</h3>
      <ul>
        <li><strong>{t('ornament_layout.help.v2.production_tips.li1.strong')}</strong> {t('ornament_layout.help.v2.production_tips.li1.text')}</li>
        <li><strong>{t('ornament_layout.help.v2.production_tips.li2.strong')}</strong> {t('ornament_layout.help.v2.production_tips.li2.text')}</li>
        <li><strong>{t('ornament_layout.help.v2.production_tips.li3.strong')}</strong> {t('ornament_layout.help.v2.production_tips.li3.text')}</li>
        <li><strong>{t('ornament_layout.help.v2.production_tips.li4.strong')}</strong> {t('ornament_layout.help.v2.production_tips.li4.text')}</li>
        <li><strong>{t('ornament_layout.help.v2.production_tips.li5.strong')}</strong> {t('ornament_layout.help.v2.production_tips.li5.text')}</li>
        <li><strong>{t('ornament_layout.help.v2.production_tips.li6.strong')}</strong> {t('ornament_layout.help.v2.production_tips.li6.text')}</li>
      </ul>

      <h3>{t('ornament_layout.help.v2.export_formats.title')}</h3>
      <ul>
        <li><strong>{t('ornament_layout.help.v2.export_formats.li1.strong')}</strong> {t('ornament_layout.help.v2.export_formats.li1.text')}</li>
        <li><strong>{t('ornament_layout.help.v2.export_formats.li2.strong')}</strong> {t('ornament_layout.help.v2.export_formats.li2.text')}</li>
        <li>{t('ornament_layout.help.v2.export_formats.li3')}</li>
        <li>{t('ornament_layout.help.v2.export_formats.li4')}</li>
      </ul>

      <h3>{t('ornament_layout.help.v2.keyboard_shortcuts.title')}</h3>
      <ul>
        <li><strong>{t('ornament_layout.help.v2.keyboard_shortcuts.li1.strong')}</strong> {t('ornament_layout.help.v2.keyboard_shortcuts.li1.text')}</li>
        <li><strong>{t('ornament_layout.help.v2.keyboard_shortcuts.li2.strong')}</strong> {t('ornament_layout.help.v2.keyboard_shortcuts.li2.text')}</li>
      </ul>

      <h3>{t('ornament_layout.help.v2.troubleshooting.title')}</h3>
      <ul>
        <li><strong>{t('ornament_layout.help.v2.troubleshooting.li1.strong')}</strong> {t('ornament_layout.help.v2.troubleshooting.li1.text')}</li>
        <li><strong>{t('ornament_layout.help.v2.troubleshooting.li2.strong')}</strong> {t('ornament_layout.help.v2.troubleshooting.li2.text')}</li>
        <li><strong>{t('ornament_layout.help.v2.troubleshooting.li3.strong')}</strong> {t('ornament_layout.help.v2.troubleshooting.li3.text')}</li>
        <li><strong>{t('ornament_layout.help.v2.troubleshooting.li4.strong')}</strong> {t('ornament_layout.help.v2.troubleshooting.li4.text')}</li>
        <li><strong>{t('ornament_layout.help.v2.troubleshooting.li5.strong')}</strong> {t('ornament_layout.help.v2.troubleshooting.li5.text')}</li>
      </ul>
    </div>
  );
}
