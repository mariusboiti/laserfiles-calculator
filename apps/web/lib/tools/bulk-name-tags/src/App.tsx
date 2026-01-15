import { useState, useEffect, useMemo, useCallback } from 'react';
import type { TextLayoutConfig, SheetLayoutConfig, NameRecord, CSVMapping, GeneratedSVG, TemplateSizeConfig, UnitSystem, HoleConfig } from './types';
import type { ParsedCSVData } from './utils/csvUtils';
import { mapCSVToNames } from './utils/csvUtils';
import { calculateSheetCapacity, generateNameTagSvg, parseTemplateBounds, sanitizeSvgForInlinePreview } from './utils/svgUtils';
import { TemplateUpload } from './components/TemplateUpload';
import { CSVUpload } from './components/CSVUpload';
import { ManualNamesInput } from './components/ManualNamesInput';
import { parseManualNames } from './utils/manualNamesUtils';
import { TextSettings } from './components/TextSettings';
import { SheetSettings } from './components/SheetSettings';
import { Preview } from './components/Preview';
import { DownloadSection } from './components/DownloadSection';
import { DEFAULTS, DEMO_NAMES } from '../config/defaults';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

const STORAGE_KEY = 'bulk-name-tag-generator.state.v1';

interface AppProps {
  onResetCallback?: (callback: () => void) => void;
}

function App({ onResetCallback }: AppProps) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const [templateSvg, setTemplateSvg] = useState<string | null>(null);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('mm');
  const [templateSize, setTemplateSize] = useState<TemplateSizeConfig | null>(null);
  const [holeConfig, setHoleConfig] = useState<HoleConfig>({ enabled: false, x: 25, y: 8, radius: 2.5 });
  const [namesInputMode, setNamesInputMode] = useState<'csv' | 'manual'>('csv');
  const [csvData, setCsvData] = useState<ParsedCSVData | null>(null);
  const [csvMapping, setCsvMapping] = useState<CSVMapping>({
    nameColumn: '',
    line2Column: undefined
  });
  const [names, setNames] = useState<NameRecord[]>([]);
  const [manualNamesText, setManualNamesText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewGenerating, setIsPreviewGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | GeneratedSVG[] | null>(null);
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);
  const [singleTagPreviewSvg, setSingleTagPreviewSvg] = useState<string | null>(null);

  const [textConfig, setTextConfig] = useState<TextLayoutConfig>({
    horizontalAlignment: 'center',
    horizontalPosition: 50,
    verticalPosition: 50,
    maxTextWidth: 80,
    fontFamily: 'sans-serif',
    embeddedFont: null,
    fontSize: 8,
    letterSpacing: 0,
    textCase: 'as-is',
    secondLineEnabled: false,
    secondLineFontSize: 6,
    secondLineVerticalOffset: 10
  });

  const [sheetConfig, setSheetConfig] = useState<SheetLayoutConfig>({
    outputMode: 'sheet',
    sheetWidth: 600,
    sheetHeight: 400,
    horizontalSpacing: 5,
    verticalSpacing: 5,
    rotation: 0,
    margin: 5,
    fillToCapacity: false
  });

  const resetToDefaults = useCallback(() => {
    setTemplateSvg(null);
    setTemplateSize(null);
    setNamesInputMode('manual');
    setManualNamesText(DEMO_NAMES.join('\n'));
    setNames(DEMO_NAMES.map(name => ({ name, line1: name, line2: undefined })));
    setCsvData(null);
    setCsvMapping({ nameColumn: '', line2Column: undefined });
    setGeneratedContent(null);
    setPreviewSvg(null);
    setTextConfig({
      horizontalAlignment: 'center',
      horizontalPosition: 50,
      verticalPosition: 50,
      maxTextWidth: 80,
      fontFamily: 'sans-serif',
      embeddedFont: null,
      fontSize: 8,
      letterSpacing: 0,
      textCase: 'as-is',
      secondLineEnabled: false,
      secondLineFontSize: 6,
      secondLineVerticalOffset: 10
    });
    setSheetConfig({
      outputMode: 'sheet',
      sheetWidth: 600,
      sheetHeight: 400,
      horizontalSpacing: 5,
      verticalSpacing: 5,
      rotation: 0,
      margin: 5,
      fillToCapacity: false
    });
  }, []);

  useEffect(() => {
    if (onResetCallback) {
      onResetCallback(resetToDefaults);
    }
  }, [onResetCallback, resetToDefaults]);

  const handleCSVLoad = (data: ParsedCSVData, mapping: CSVMapping) => {
    setCsvData(data);
    setCsvMapping(mapping);
    const mappedNames = mapCSVToNames(data.rows, mapping);
    setNames(mappedNames);
  };

  const handleTemplateLoad = (svg: string) => {
    setTemplateSvg(svg);
    try {
      const bounds = parseTemplateBounds(svg);
      setTemplateSize({ width: bounds.width, height: bounds.height, lockAspect: true });
    } catch {
      setTemplateSize(null);
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<{
        unitSystem: UnitSystem;
        templateSize: TemplateSizeConfig | null;
        namesInputMode: 'csv' | 'manual';
        manualNamesText: string;
        textConfig: TextLayoutConfig;
        sheetConfig: SheetLayoutConfig;
        csvMapping: CSVMapping;
      }>;

      const nextMode = parsed.namesInputMode ?? 'csv';
      const nextManualText = typeof parsed.manualNamesText === 'string' ? parsed.manualNamesText : '';

      if (parsed.unitSystem) setUnitSystem(parsed.unitSystem);
      if (parsed.templateSize) setTemplateSize(parsed.templateSize);
      setNamesInputMode(nextMode);
      setManualNamesText(nextManualText);
      if (parsed.textConfig) setTextConfig(current => ({ ...current, ...parsed.textConfig }));
      if (parsed.sheetConfig) setSheetConfig(current => ({ ...current, ...parsed.sheetConfig }));
      if (parsed.csvMapping) setCsvMapping(parsed.csvMapping);

      if (nextMode === 'manual') {
        setNames(parseManualNames(nextManualText));
      }
    } catch (e) {
      void e;
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          unitSystem,
          templateSize,
          namesInputMode,
          manualNamesText,
          textConfig,
          sheetConfig,
          csvMapping
        })
      );
    } catch (e) {
      void e;
    }
  }, [unitSystem, templateSize, namesInputMode, manualNamesText, textConfig, sheetConfig, csvMapping]);

  useEffect(() => {
    if (namesInputMode !== 'csv') return;
    if (csvData && csvMapping.nameColumn) {
      const mappedNames = mapCSVToNames(csvData.rows, csvMapping);
      setNames(mappedNames);
    }
  }, [csvData, csvMapping, namesInputMode]);

  useEffect(() => {
    setGeneratedContent(null);

    if (!templateSvg || names.length === 0) {
      setPreviewSvg(null);
      setSingleTagPreviewSvg(null);
      return;
    }

    const generatePreviews = async () => {
      try {
        // Generate single tag preview (first name only)
        const singleTagConfig = { ...sheetConfig, outputMode: 'separate' as const };
        const singleResult = await generateNameTagSvg(templateSvg, [names[0]], textConfig, singleTagConfig, { templateSize, unitSystem, holeConfig });
        if (Array.isArray(singleResult) && singleResult.length > 0) {
          setSingleTagPreviewSvg(sanitizeSvgForInlinePreview(singleResult[0].svg));
        } else {
          setSingleTagPreviewSvg(null);
        }

        // Generate sheet preview
        const previewNames = sheetConfig.outputMode === 'separate'
          ? names.slice(0, 3)
          : names;

        const result = await generateNameTagSvg(templateSvg, previewNames, textConfig, sheetConfig, { templateSize, unitSystem, holeConfig });

        if (sheetConfig.outputMode === 'sheet' && typeof result === 'string') {
          setPreviewSvg(sanitizeSvgForInlinePreview(result));
        } else if (sheetConfig.outputMode === 'separate' && Array.isArray(result)) {
          setPreviewSvg(result.map(item => sanitizeSvgForInlinePreview(item.svg)).join('\n'));
        } else {
          setPreviewSvg(null);
        }
      } catch (error) {
        console.error('Preview generation error:', error);
        setPreviewSvg(null);
      }
    };

    generatePreviews();
  }, [templateSvg, names, textConfig, sheetConfig, templateSize, unitSystem, holeConfig]);

  const handleGenerate = async () => {
    if (!templateSvg || names.length === 0) return;

    setIsGenerating(true);

    try {
      const result = await generateNameTagSvg(templateSvg, names, textConfig, sheetConfig, { templateSize, unitSystem, holeConfig });
      setGeneratedContent(result);
    } catch (error) {
      console.error('Generation error:', error);
      alert(`${t('bulk_name_tags.errors.generate_failed')} ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const sheetStats = useMemo(() => {
    if (!templateSvg) return null;
    if (sheetConfig.outputMode !== 'sheet') return null;

    try {
      const bounds = parseTemplateBounds(templateSvg);
      const effectiveBounds = templateSize
        ? { ...bounds, width: templateSize.width, height: templateSize.height }
        : bounds;
      const cap = calculateSheetCapacity(effectiveBounds, sheetConfig);
      const fillToCapacity = !!sheetConfig.fillToCapacity;
      const willGenerate = cap.maxTags === 0
        ? 0
        : fillToCapacity
          ? cap.maxTags
          : Math.min(names.length, cap.maxTags);
      return {
        tagsPerRow: cap.tagsPerRow,
        tagsPerColumn: cap.tagsPerColumn,
        maxTags: cap.maxTags,
        namesCount: names.length,
        fillToCapacity,
        willGenerate
      };
    } catch {
      return null;
    }
  }, [templateSvg, templateSize, sheetConfig, names.length]);

  const canGenerate = templateSvg !== null && names.length > 0 && (
    sheetConfig.outputMode !== 'sheet' || (sheetStats?.maxTags ?? 1) > 0
  );

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/60">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-slate-100">
            {t('bulk_name_tags.header_title')}
          </h1>
          <p className="text-slate-400 mt-1">
            {t('bulk_name_tags.header_subtitle')}
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          <div className="space-y-6">
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-2">{t('bulk_name_tags.units.title')}</h2>
              <p className="text-sm text-slate-400 mb-4">
                {t('bulk_name_tags.units.desc')}
              </p>

              <select
                value={unitSystem}
                onChange={(e) => setUnitSystem(e.target.value as UnitSystem)}
                className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="mm">{t('bulk_name_tags.units.mm')}</option>
                <option value="in">{t('bulk_name_tags.units.in')}</option>
              </select>
            </div>

            <TemplateUpload 
              onTemplateLoad={handleTemplateLoad}
              templateSvg={templateSvg}
              unitSystem={unitSystem}
              templateSize={templateSize}
              onTemplateSizeChange={setTemplateSize}
              holeConfig={holeConfig}
              onHoleConfigChange={setHoleConfig}
            />

            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-2">{t('bulk_name_tags.names_input_mode.title')}</h2>
              <p className="text-sm text-slate-400 mb-4">
                {t('bulk_name_tags.names_input_mode.desc')}
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <input
                    type="radio"
                    name="namesInputMode"
                    checked={namesInputMode === 'csv'}
                    onChange={() => {
                      setNamesInputMode('csv');
                      if (csvData && csvMapping.nameColumn) {
                        setNames(mapCSVToNames(csvData.rows, csvMapping));
                      } else {
                        setNames([]);
                      }
                    }}
                    className="h-4 w-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950"
                  />
                  {t('bulk_name_tags.names_input_mode.csv')}
                </label>

                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <input
                    type="radio"
                    name="namesInputMode"
                    checked={namesInputMode === 'manual'}
                    onChange={() => {
                      setNamesInputMode('manual');
                      setNames(parseManualNames(manualNamesText));
                    }}
                    className="h-4 w-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950"
                  />
                  {t('bulk_name_tags.names_input_mode.manual')}
                </label>
              </div>
            </div>

            {namesInputMode === 'csv' ? (
              <CSVUpload 
                onCSVLoad={handleCSVLoad}
                csvData={csvData}
                mapping={csvMapping}
              />
            ) : (
              <ManualNamesInput
                value={manualNamesText}
                onChange={setManualNamesText}
                onNamesChange={setNames}
              />
            )}

            <TextSettings 
              config={textConfig}
              onChange={setTextConfig}
              unitSystem={unitSystem}
            />

            <SheetSettings 
              config={sheetConfig}
              onChange={setSheetConfig}
              unitSystem={unitSystem}
            />
          </div>

          <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] flex flex-col gap-6">
            <div className="flex-1 min-h-0">
              <Preview 
                svgContent={previewSvg}
                isGenerating={isGenerating}
                singleTagSvg={singleTagPreviewSvg}
                sheetWidth={sheetConfig.sheetWidth}
                sheetHeight={sheetConfig.sheetHeight}
              />
            </div>

            <div className="shrink-0">
              <DownloadSection 
                generatedContent={generatedContent}
                outputMode={sheetConfig.outputMode}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
                sheetStats={sheetStats}
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 bg-slate-900/60 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-slate-400 text-sm">
          <p>{t('bulk_name_tags.footer')}</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
