import type { SheetLayoutConfig, UnitSystem } from '../types';
import { useCallback } from 'react';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

interface SheetSettingsProps {
  config: SheetLayoutConfig;
  onChange: (config: SheetLayoutConfig) => void;
  unitSystem: UnitSystem;
}

export function SheetSettings({ config, onChange, unitSystem }: SheetSettingsProps) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const updateConfig = (updates: Partial<SheetLayoutConfig>) => {
    onChange({ ...config, ...updates });
  };

  const mmToIn = (mm: number) => mm / 25.4;
  const inToMm = (inch: number) => inch * 25.4;
  const toDisplay = (mm: number) => (unitSystem === 'in' ? mmToIn(mm) : mm);
  const fromDisplay = (value: number) => (unitSystem === 'in' ? inToMm(value) : value);

  const sheetMin = unitSystem === 'in' ? 2 : 50;
  const sheetMax = unitSystem === 'in' ? 80 : 2000;
  const sheetStep = unitSystem === 'in' ? '0.1' : '1';
  const spacingMax = unitSystem === 'in' ? 2 : 50;
  const spacingStep = unitSystem === 'in' ? '0.01' : '0.5';
  const marginMin = 0;
  const marginMax = unitSystem === 'in' ? 2 : 50;
  const marginStep = unitSystem === 'in' ? '0.01' : '0.5';

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
      <h3 className="text-lg font-semibold text-slate-100 mb-4">{t('bulk_name_tags.sheet.title')}</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            {t('bulk_name_tags.sheet.output_mode')}
          </label>
          <select
            value={config.outputMode}
            onChange={(e) => updateConfig({ outputMode: e.target.value as 'sheet' | 'separate' })}
            className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="sheet">{t('bulk_name_tags.sheet.output_mode_sheet')}</option>
            <option value="separate">{t('bulk_name_tags.sheet.output_mode_separate')}</option>
          </select>
        </div>

        {config.outputMode === 'sheet' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {t('bulk_name_tags.sheet.sheet_width').replace('{unit}', unitSystem)}
                </label>
                <input
                  type="number"
                  min={sheetMin}
                  max={sheetMax}
                  step={sheetStep}
                  value={Number(toDisplay(config.sheetWidth).toFixed(unitSystem === 'in' ? 3 : 1))}
                  onChange={(e) => updateConfig({ sheetWidth: fromDisplay(Number(e.target.value)) })}
                  className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {t('bulk_name_tags.sheet.sheet_height').replace('{unit}', unitSystem)}
                </label>
                <input
                  type="number"
                  min={sheetMin}
                  max={sheetMax}
                  step={sheetStep}
                  value={Number(toDisplay(config.sheetHeight).toFixed(unitSystem === 'in' ? 3 : 1))}
                  onChange={(e) => updateConfig({ sheetHeight: fromDisplay(Number(e.target.value)) })}
                  className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {t('bulk_name_tags.sheet.horizontal_spacing').replace('{unit}', unitSystem)}
                </label>
                <input
                  type="number"
                  min="0"
                  max={spacingMax}
                  step={spacingStep}
                  value={Number(toDisplay(config.horizontalSpacing).toFixed(unitSystem === 'in' ? 3 : 2))}
                  onChange={(e) => updateConfig({ horizontalSpacing: fromDisplay(Number(e.target.value)) })}
                  className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {t('bulk_name_tags.sheet.vertical_spacing').replace('{unit}', unitSystem)}
                </label>
                <input
                  type="number"
                  min="0"
                  max={spacingMax}
                  step={spacingStep}
                  value={Number(toDisplay(config.verticalSpacing).toFixed(unitSystem === 'in' ? 3 : 2))}
                  onChange={(e) => updateConfig({ verticalSpacing: fromDisplay(Number(e.target.value)) })}
                  className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {t('bulk_name_tags.sheet.margin').replace('{unit}', unitSystem)}
              </label>
              <input
                type="number"
                min={marginMin}
                max={marginMax}
                step={marginStep}
                value={Number(toDisplay(config.margin).toFixed(unitSystem === 'in' ? 3 : 2))}
                onChange={(e) => updateConfig({ margin: fromDisplay(Number(e.target.value)) })}
                className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {t('bulk_name_tags.sheet.rotation')}
              </label>
              <select
                value={config.rotation}
                onChange={(e) => updateConfig({ rotation: Number(e.target.value) as 0 | 90 })}
                className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="0">{t('bulk_name_tags.sheet.rotation_0')}</option>
                <option value="90">{t('bulk_name_tags.sheet.rotation_90')}</option>
              </select>
            </div>

            <label className="flex items-start gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={!!config.fillToCapacity}
                onChange={(e) => updateConfig({ fillToCapacity: e.target.checked })}
                className="h-4 w-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950 rounded"
              />
              <span>
                {t('bulk_name_tags.sheet.fill_to_capacity')}
              </span>
            </label>

            <div className="border-t border-slate-700 pt-4 mt-4">
              <label className="flex items-start gap-2 text-sm text-slate-300 mb-3">
                <input
                  type="checkbox"
                  checked={!!config.manualGridEnabled}
                  onChange={(e) => updateConfig({ manualGridEnabled: e.target.checked })}
                  className="h-4 w-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950 rounded"
                />
                <span>
                  {t('bulk_name_tags.sheet.manual_grid')}
                </span>
              </label>

              {config.manualGridEnabled && (
                <div className="grid grid-cols-2 gap-4 ml-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      {t('bulk_name_tags.sheet.columns')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={config.manualColumns ?? 2}
                      onChange={(e) => updateConfig({ manualColumns: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      {t('bulk_name_tags.sheet.rows')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={config.manualRows ?? 2}
                      onChange={(e) => updateConfig({ manualRows: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
