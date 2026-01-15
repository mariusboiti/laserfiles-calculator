import type { EmbeddedFontFormat, TextLayoutConfig, UnitSystem } from '../types';
import { useCallback } from 'react';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

interface TextSettingsProps {
  config: TextLayoutConfig;
  onChange: (config: TextLayoutConfig) => void;
  unitSystem: UnitSystem;
}

export function TextSettings({ config, onChange, unitSystem }: TextSettingsProps) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const updateConfig = (updates: Partial<TextLayoutConfig>) => {
    onChange({ ...config, ...updates });
  };

  const mmToIn = (mm: number) => mm / 25.4;
  const inToMm = (inch: number) => inch * 25.4;
  const toDisplay = (mm: number) => (unitSystem === 'in' ? mmToIn(mm) : mm);
  const fromDisplay = (value: number) => (unitSystem === 'in' ? inToMm(value) : value);

  const updateFontFamily = async (fontFamily: string) => {
    console.log('updateFontFamily called with:', fontFamily);
    
    // Check if this is one of the keychain fonts
    const isKeychainFont = fontOptions.find(opt => opt.value === fontFamily && !opt.label.includes('(System)'));
    
    if (isKeychainFont) {
      console.log('Loading keychain font:', fontFamily);
      // Load the font from /fonts/keychain/
      const fontFileName = `${fontFamily}.ttf`;
      const fontUrl = `/fonts/keychain/${encodeURIComponent(fontFileName)}`;
      
      try {
        const response = await fetch(fontUrl);
        console.log('Font fetch response:', response.ok, response.status);
        if (response.ok) {
          const blob = await response.blob();
          const reader = new FileReader();
          
          reader.onload = () => {
            const dataUrl = typeof reader.result === 'string' ? reader.result : '';
            if (dataUrl) {
              console.log('Font loaded successfully, data URL length:', dataUrl.length);
              onChange({
                ...config,
                fontFamily,
                embeddedFont: {
                  fontFamily,
                  dataUrl,
                  format: 'truetype'
                }
              });
            }
          };
          
          reader.readAsDataURL(blob);
          return;
        } else {
          console.error('Font fetch failed:', response.status);
        }
      } catch (error) {
        console.error('Failed to load font:', error);
      }
    } else {
      console.log('System font selected:', fontFamily);
    }
    
    // For system fonts or if loading failed, just update font family
    onChange({
      ...config,
      fontFamily,
      embeddedFont: null
    });
  };

  const getFormatFromFileName = (name: string): EmbeddedFontFormat | null => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'ttf') return 'truetype';
    if (ext === 'otf') return 'opentype';
    if (ext === 'woff') return 'woff';
    if (ext === 'woff2') return 'woff2';
    return null;
  };

  const fontOptions: Array<{ value: string; label: string }> = [
    { value: 'Absolute', label: 'Absolute' },
    { value: 'Agatha', label: 'Agatha' },
    { value: 'Almonde', label: 'Almonde' },
    { value: 'Amastay', label: 'Amastay' },
    { value: 'Amelissa Partis', label: 'Amelissa Partis' },
    { value: 'Angelin Calligraphy 2', label: 'Angelin Calligraphy 2' },
    { value: 'Angelina Bold', label: 'Angelina Bold' },
    { value: 'Arsegtosia Script 1', label: 'Arsegtosia Script 1' },
    { value: 'Ashley Marie', label: 'Ashley Marie' },
    { value: 'Astoria', label: 'Astoria' },
    { value: 'Baby Boho', label: 'Baby Boho' },
    { value: 'Barbie Script', label: 'Barbie Script' },
    { value: 'Basthiyan Script', label: 'Basthiyan Script' },
    { value: 'Birthday', label: 'Birthday' },
    { value: 'Black Vintage Script 1', label: 'Black Vintage Script 1' },
    { value: 'Boho', label: 'Boho' },
    { value: 'Bristol Script', label: 'Bristol Script' },
    { value: 'Calestine', label: 'Calestine' },
    { value: 'Chocolates', label: 'Chocolates' },
    { value: 'Delighter', label: 'Delighter' },
    { value: 'Family Script', label: 'Family Script' },
    { value: 'Flondayscript Bold', label: 'Flondayscript Bold' },
    { value: 'Flondayscript Regular', label: 'Flondayscript Regular' },
    { value: 'Handwriting', label: 'Handwriting' },
    { value: 'Heart Style', label: 'Heart Style' },
    { value: 'Heartbeat', label: 'Heartbeat' },
    { value: 'Hello Mother 1', label: 'Hello Mother 1' },
    { value: 'Kingdom', label: 'Kingdom' },
    { value: 'Lustia Script', label: 'Lustia Script' },
    { value: 'Masterline Script', label: 'Masterline Script' },
    { value: 'Milkshake', label: 'Milkshake' },
    { value: 'Mother Father Script', label: 'Mother Father Script' },
    { value: 'My Love Script', label: 'My Love Script' },
    { value: 'Samantha Script', label: 'Samantha Script' },
    { value: 'Santiago', label: 'Santiago' },
    { value: 'Saturday', label: 'Saturday' },
    { value: 'September Script', label: 'September Script' },
    { value: 'Shella Script', label: 'Shella Script' },
    { value: 'Simple Signature', label: 'Simple Signature' },
    { value: 'Splashed', label: 'Splashed' },
    { value: 'Stylish Calligraphy', label: 'Stylish Calligraphy' },
    { value: 'Sweet Honey', label: 'Sweet Honey' },
    { value: 'The Family Calligraphy Script 1', label: 'The Family Calligraphy Script 1' },
    { value: 'Welcome', label: 'Welcome' },
    { value: 'Arial', label: 'Arial (System)' },
    { value: 'sans-serif', label: 'Sans-serif (System)' },
    { value: 'serif', label: 'Serif (System)' }
  ];

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="text-xl font-semibold text-slate-100 mb-2">{t('bulk_name_tags.text.step_title')}</h2>
      <p className="text-sm text-slate-400 mb-4">
        {t('bulk_name_tags.text.desc')}
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            {t('bulk_name_tags.text.horizontal_alignment')}
          </label>
          <select
            value={config.horizontalAlignment}
            onChange={(e) => updateConfig({ horizontalAlignment: e.target.value as 'left' | 'center' | 'right' })}
            className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="left">{t('bulk_name_tags.text.align_left')}</option>
            <option value="center">{t('bulk_name_tags.text.align_center')}</option>
            <option value="right">{t('bulk_name_tags.text.align_right')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            {t('bulk_name_tags.text.horizontal_position').replace(
              '{value}',
              String(typeof config.horizontalPosition === 'number' ? config.horizontalPosition : 50)
            )}
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={typeof config.horizontalPosition === 'number' ? config.horizontalPosition : 50}
            onChange={(e) => updateConfig({ horizontalPosition: Number(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>{t('bulk_name_tags.text.align_left')}</span>
            <span>{t('bulk_name_tags.text.align_right')}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            {t('bulk_name_tags.text.vertical_position').replace('{value}', String(config.verticalPosition))}
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={config.verticalPosition}
            onChange={(e) => updateConfig({ verticalPosition: Number(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>{t('bulk_name_tags.text.slider_top')}</span>
            <span>{t('bulk_name_tags.text.slider_bottom')}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            {t('bulk_name_tags.text.max_text_width').replace('{value}', String(config.maxTextWidth))}
          </label>
          <input
            type="range"
            min="20"
            max="100"
            value={config.maxTextWidth}
            onChange={(e) => updateConfig({ maxTextWidth: Number(e.target.value) })}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            {t('bulk_name_tags.text.font_family')}
          </label>
          <select
            value={config.fontFamily}
            onChange={(e) => updateFontFamily(e.target.value)}
            className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {fontOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="mt-2">
            <label className="block text-xs font-medium text-slate-400 mb-1">
              {t('bulk_name_tags.text.custom_font_label')}
            </label>
            <input
              type="text"
              value={config.fontFamily}
              onChange={(e) => updateFontFamily(e.target.value)}
              placeholder={t('bulk_name_tags.text.custom_font_placeholder')}
              className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="mt-3">
            <label className="block text-xs font-medium text-slate-400 mb-1">
              {t('bulk_name_tags.text.upload_font_label')}
            </label>

            <input
              id="embedded-font-upload"
              type="file"
              accept=".ttf,.otf,.woff,.woff2"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const format = getFormatFromFileName(file.name);
                if (!format) return;

                const defaultFamily = file.name.replace(/\.[^/.]+$/, '');
                const reader = new FileReader();

                reader.onload = () => {
                  const dataUrl = typeof reader.result === 'string' ? reader.result : '';
                  if (!dataUrl) return;

                  onChange({
                    ...config,
                    fontFamily: defaultFamily,
                    embeddedFont: {
                      fontFamily: defaultFamily,
                      dataUrl,
                      format
                    }
                  });
                };

                reader.readAsDataURL(file);
              }}
              className="hidden"
            />

            <label
              htmlFor="embedded-font-upload"
              className="mt-1 inline-flex w-full items-center justify-center rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 cursor-pointer"
            >
              {t('bulk_name_tags.text.choose_font_file')}
            </label>

            <div className="mt-1 text-xs text-slate-500">
              {t('bulk_name_tags.text.accepted_formats')}
            </div>

            {config.embeddedFont && (
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-300 bg-slate-800/60 border border-slate-700 rounded p-2">
                <div className="truncate">
                  {t('bulk_name_tags.text.embedded_prefix')} {config.embeddedFont.fontFamily} ({config.embeddedFont.format})
                </div>
                <button
                  type="button"
                  onClick={() => updateConfig({ embeddedFont: null })}
                  className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  {t('bulk_name_tags.text.remove')}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              {t('bulk_name_tags.text.font_size').replace('{unit}', unitSystem)}
            </label>
            <input
              type="number"
              min="1"
              max="50"
              step={unitSystem === 'in' ? '0.01' : '0.5'}
              value={Number(toDisplay(config.fontSize).toFixed(unitSystem === 'in' ? 3 : 2))}
              onChange={(e) => updateConfig({ fontSize: fromDisplay(Number(e.target.value)) })}
              className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              {t('bulk_name_tags.text.letter_spacing').replace('{unit}', unitSystem)}
            </label>
            <input
              type="number"
              min="0"
              max="5"
              step={unitSystem === 'in' ? '0.001' : '0.1'}
              value={Number(toDisplay(config.letterSpacing).toFixed(unitSystem === 'in' ? 4 : 3))}
              onChange={(e) => updateConfig({ letterSpacing: fromDisplay(Number(e.target.value)) })}
              className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            {t('bulk_name_tags.text.text_case')}
          </label>
          <select
            value={config.textCase}
            onChange={(e) => updateConfig({ textCase: e.target.value as 'as-is' | 'uppercase' | 'capitalize' })}
            className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="as-is">{t('bulk_name_tags.text.case_as_is')}</option>
            <option value="uppercase">{t('bulk_name_tags.text.case_uppercase')}</option>
            <option value="capitalize">{t('bulk_name_tags.text.case_capitalize')}</option>
          </select>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              id="secondLine"
              checked={config.secondLineEnabled}
              onChange={(e) => updateConfig({ secondLineEnabled: e.target.checked })}
              className="h-4 w-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950 rounded"
            />
            <label htmlFor="secondLine" className="ml-2 block text-sm font-medium text-slate-300">
              {t('bulk_name_tags.text.enable_second_line')}
            </label>
          </div>

          {config.secondLineEnabled && (
            <div className="space-y-3 ml-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {t('bulk_name_tags.text.second_line_font_size').replace('{unit}', unitSystem)}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    step={unitSystem === 'in' ? '0.01' : '0.5'}
                    value={Number(toDisplay(config.secondLineFontSize).toFixed(unitSystem === 'in' ? 3 : 2))}
                    onChange={(e) => updateConfig({ secondLineFontSize: fromDisplay(Number(e.target.value)) })}
                    className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {t('bulk_name_tags.text.second_line_vertical_offset').replace('{unit}', unitSystem)}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step={unitSystem === 'in' ? '0.01' : '0.5'}
                    value={Number(toDisplay(config.secondLineVerticalOffset).toFixed(unitSystem === 'in' ? 3 : 2))}
                    onChange={(e) => updateConfig({ secondLineVerticalOffset: fromDisplay(Number(e.target.value)) })}
                    className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
