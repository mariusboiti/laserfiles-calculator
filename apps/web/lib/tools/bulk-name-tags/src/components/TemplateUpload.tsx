import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';
import { templateLibrary } from '../templateLibrary';
import { parseTemplateBounds } from '../utils/svgUtils';
import { validateLaserSafeSvg } from '../utils/aiTemplateUtils';
import { extractSvgFromAiResponse } from '../../core/extractSvgFromAi';
import { formatShapeSpecSummary, parseShapeSpec, shapeSpecToSvg, type ShapeSpec } from '../../core/aiShapeSpec';
import { generateSilhouetteImage, getSilhouetteAiStatus } from '../../core/generateSilhouetteImage';
import { traceImageToSvg, traceImageToLaserSvgViaPotrace, type TraceDetail } from '../../core/traceImageToSvg';
import { normalizeImage } from '../../core/imageNormalize';
import { wrapTracedSvg } from '../../core/wrapTracedSvg';
import type { TemplateSizeConfig, UnitSystem, HoleConfig } from '../types';

interface TemplateUploadProps {
  onTemplateLoad: (svg: string) => void;
  templateSvg: string | null;
  unitSystem: UnitSystem;
  templateSize: TemplateSizeConfig | null;
  onTemplateSizeChange: (next: TemplateSizeConfig | null) => void;
  holeConfig: HoleConfig;
  onHoleConfigChange: (config: HoleConfig) => void;
}

export function TemplateUpload({ onTemplateLoad, templateSvg, unitSystem, templateSize, onTemplateSizeChange, holeConfig, onHoleConfigChange }: TemplateUploadProps) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const [error, setError] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const aiMode = 'silhouette'; // Only silhouette mode is supported

  const [silhouetteConfigured, setSilhouetteConfigured] = useState<boolean>(false);
  const [silhouetteConfigMessage, setSilhouetteConfigMessage] = useState<string>('');
  const [silhouetteImageDataUrl, setSilhouetteImageDataUrl] = useState<string>('');
  const [silhouetteTraceDetail, setSilhouetteTraceDetail] = useState<TraceDetail>('medium');
  const [silhouetteThreshold, setSilhouetteThreshold] = useState<number>(128);
  const [silhouetteRemoveSpecks, setSilhouetteRemoveSpecks] = useState<boolean>(true);
  const [silhouetteUsePotrace, setSilhouetteUsePotrace] = useState<boolean>(true);
  const [silhouettePotraceThreshold, setSilhouettePotraceThreshold] = useState<number>(175);
  const [silhouettePotraceDenoise, setSilhouettePotraceDenoise] = useState<number>(2);
  const [silhouettePotraceInvert, setSilhouettePotraceInvert] = useState<boolean>(false);
  const [silhouettePotraceAutoInvert, setSilhouettePotraceAutoInvert] = useState<boolean>(true);
  const [silhouettePotraceOptTolerance, setSilhouettePotraceOptTolerance] = useState<number>(0.2);
  const [silhouetteTracedSvg, setSilhouetteTracedSvg] = useState<string>('');
  const [silhouetteTraceDebug, setSilhouetteTraceDebug] = useState<string[]>([]);
  const [silhouetteNormalizeIssues, setSilhouetteNormalizeIssues] = useState<string[]>([]);

  const [smartSpec, setSmartSpec] = useState<ShapeSpec | null>(null);
  const [smartErrors, setSmartErrors] = useState<string[]>([]);
  const [smartWarnings, setSmartWarnings] = useState<string[]>([]);
  const [smartSummaryLines, setSmartSummaryLines] = useState<string[]>([]);
  const [smartRawResponse, setSmartRawResponse] = useState<string>('');
  const [smartGeneratedPreview, setSmartGeneratedPreview] = useState<string>('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiIssues, setAiIssues] = useState<string[]>([]);
  const [aiDebugLines, setAiDebugLines] = useState<string[]>([]);
  const [aiExtractedPreview, setAiExtractedPreview] = useState<string>('');
  const [aiExtractedSnippet, setAiExtractedSnippet] = useState<string>('');
  const [aiRawResponse, setAiRawResponse] = useState<string>('');
  const [aiExtractSource, setAiExtractSource] = useState<'json' | 'regex' | 'none' | ''>('');

  function parseSvg(svg: string) {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const hasParserError = doc.getElementsByTagName('parsererror').length > 0;
    const root = doc.documentElement;
    const isSvg = !!root && root.tagName.toLowerCase() === 'svg';
    return { ok: !hasParserError && isSvg, doc, root, hasParserError };
  }

  const mmToIn = (mm: number) => mm / 25.4;
  const inToMm = (inch: number) => inch * 25.4;
  const toDisplay = (mm: number) => (unitSystem === 'in' ? mmToIn(mm) : mm);
  const fromDisplay = (value: number) => (unitSystem === 'in' ? inToMm(value) : value);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.svg')) {
      setError(t('bulk_name_tags.template.error_upload_svg'));
      return;
    }

    try {
      const text = await file.text();
      if (!text.includes('<svg')) {
        setError(t('bulk_name_tags.template.error_invalid_svg'));
        return;
      }
      setError('');
      setSelectedTemplateId('');
      onTemplateLoad(text);
    } catch {
      setError(t('bulk_name_tags.template.error_read_file'));
    }
  };

  const handleExampleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedTemplateId(id);

    if (!id) return;

    const selected = templateLibrary.find(t => t.id === id);
    if (!selected) return;

    setError('');
    onTemplateLoad(selected.svg);
  };

  useEffect(() => {
    getSilhouetteAiStatus().then((status) => {
      setSilhouetteConfigured(status.configured);
      setSilhouetteConfigMessage(status.message || '');
    }).catch(() => {
      setSilhouetteConfigured(false);
      setSilhouetteConfigMessage(t('bulk_name_tags.template.error_check_ai_config'));
    });
  }, [t]);

  const resetAiState = () => {
    setError('');
    setIsAiGenerating(false);

    setSmartSpec(null);
    setSmartErrors([]);
    setSmartWarnings([]);
    setSmartSummaryLines([]);
    setSmartRawResponse('');
    setSmartGeneratedPreview('');

    setAiIssues([]);
    setAiDebugLines([]);
    setAiExtractedPreview('');
    setAiExtractedSnippet('');
    setAiRawResponse('');
    setAiExtractSource('');

    setSilhouetteImageDataUrl('');
    setSilhouetteTracedSvg('');
    setSilhouetteTraceDebug([]);
    setSilhouetteNormalizeIssues([]);
  };

  const buildRoundedRectFallbackSpec = (): ShapeSpec => ({
    shape: 'rounded-rect',
    size: { w: 80, h: 30 },
    hole: { d: 5, pos: 'top-left', margin: 4 },
    style: { roundness: 0.25 },
  });

  const handleUseFallback = () => {
    const spec = buildRoundedRectFallbackSpec();
    const svg = shapeSpecToSvg(spec);
    const validation = validateLaserSafeSvg(svg);

    setSelectedTemplateId('');
    setSmartSpec(spec);
    setSmartWarnings([]);
    setSmartErrors([]);
    setSmartRawResponse('');
    setSmartGeneratedPreview(validation.sanitizedSvg || svg);

    const summary = formatShapeSpecSummary(spec);
    setSmartSummaryLines(summary.lines);

    onTemplateLoad(validation.sanitizedSvg || svg);
  };

  const handleAIGenerateSmart = async (opts?: { simpler?: boolean }) => {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      setError(t('bulk_name_tags.template.error_prompt_required_template'));
      return;
    }

    setIsAiGenerating(true);
    setError('');
    setSmartSpec(null);
    setSmartErrors([]);
    setSmartWarnings([]);
    setSmartSummaryLines([]);
    setSmartRawResponse('');
    setSmartGeneratedPreview('');

    try {
      const res = await fetch('/api/bulk-name-tags/ai-shape-spec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, simpler: !!opts?.simpler }),
      });

      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errJson: any = await res.json().catch(() => ({}));
          throw new Error(errJson?.error || t('bulk_name_tags.template.error_ai_generation_failed'));
        }
        const errText = await res.text().catch(() => '');
        throw new Error(errText || t('bulk_name_tags.template.error_ai_generation_failed'));
      }

      const data: any = await res.json();
      const responseText = (typeof data?.responseText === 'string' && data.responseText) || '';
      setSmartRawResponse(responseText);

      const parsed = parseShapeSpec(responseText);
      if (!parsed.spec) {
        setSmartErrors(
          parsed.errors.length ? parsed.errors : [t('bulk_name_tags.template.error_shape_spec_parse_failed')]
        );
        throw new Error(t('bulk_name_tags.template.error_ai_invalid_json'));
      }

      setSmartWarnings(parsed.errors);
      setSmartSpec(parsed.spec);

      const svg = shapeSpecToSvg(parsed.spec);
      const parsedSvg = parseSvg(svg);
      if (!parsedSvg.ok) {
        setSmartErrors([t('bulk_name_tags.template.error_generated_svg_parse_failed')]);
        throw new Error(t('bulk_name_tags.template.error_generated_svg_parse_failed'));
      }

      const validation = validateLaserSafeSvg(svg);
      setSmartGeneratedPreview(validation.sanitizedSvg || svg);
      if (!validation.ok) {
        setSmartErrors(validation.issues);
        throw new Error(t('bulk_name_tags.template.error_generated_svg_validation_failed'));
      }

      const summary = formatShapeSpecSummary(parsed.spec);
      setSmartSummaryLines(summary.lines);

      setSelectedTemplateId('');
      onTemplateLoad(validation.sanitizedSvg || svg);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('bulk_name_tags.template.error_ai_generation_failed'));
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSilhouetteGenerate = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      setError(t('bulk_name_tags.template.error_prompt_required_silhouette'));
      return;
    }

    setIsAiGenerating(true);
    setError('');
    setSilhouetteImageDataUrl('');
    setSilhouetteTracedSvg('');
    setSilhouetteTraceDebug([]);
    setSilhouetteNormalizeIssues([]);

    try {
      const result = await generateSilhouetteImage(prompt);
      setSilhouetteImageDataUrl(result.dataUrl);
      setSelectedTemplateId('');

      // Auto-trace after generation for clean defaults.
      window.setTimeout(() => {
        void handleSilhouetteTrace();
      }, 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('bulk_name_tags.template.error_silhouette_generation_failed'));
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSilhouetteTrace = async () => {
    if (!silhouetteImageDataUrl) {
      setError(t('bulk_name_tags.template.error_no_image_to_trace'));
      return;
    }

    setIsAiGenerating(true);
    setError('');
    setSilhouetteTracedSvg('');
    setSilhouetteTraceDebug([]);
    setSilhouetteNormalizeIssues([]);

    try {
      const allDebug: string[] = [];
      const allIssues: string[] = [];

      const normalizeResult = await normalizeImage(silhouetteImageDataUrl, {
        targetWidth: 1024,
        targetHeight: 512,
        padding: 20,
        alphaThreshold: 10,
        autoRotate: true,
      });

      allDebug.push(...normalizeResult.debug);
      if (normalizeResult.rotated) {
        allIssues.push(t('bulk_name_tags.template.info_image_auto_rotated'));
      }

      const targetW = templateSize?.width || 80;
      const targetH = templateSize?.height || 30;

      let finalSvg = '';

      if (silhouetteUsePotrace) {
        const potrace = await traceImageToLaserSvgViaPotrace(normalizeResult.dataUrl, {
          targetWidthMm: targetW,
          targetHeightMm: targetH,
          threshold: silhouettePotraceThreshold,
          denoise: silhouettePotraceDenoise,
          autoInvert: silhouettePotraceAutoInvert,
          invert: silhouettePotraceInvert,
          optTolerance: silhouettePotraceOptTolerance,
        });
        allDebug.push(...potrace.debug);
        finalSvg = potrace.svg;
      } else {
        const traceResult = await traceImageToSvg(normalizeResult.dataUrl, {
          detail: silhouetteTraceDetail,
          threshold: silhouetteThreshold,
          removeSpecks: silhouetteRemoveSpecks,
        });

        allDebug.push(...traceResult.debug);

        const wrapResult = wrapTracedSvg(traceResult.svg, {
          targetWidthMm: targetW,
          targetHeightMm: targetH,
          canvasWidth: traceResult.canvasWidth,
          canvasHeight: traceResult.canvasHeight,
          marginMm: 2,
        });

        allIssues.push(...wrapResult.issues);
        finalSvg = wrapResult.svg;
      }

      if (!finalSvg) {
        throw new Error(t('bulk_name_tags.template.error_empty_svg'));
      }

      const parsed = parseSvg(finalSvg);
      if (!parsed.ok) {
        throw new Error(t('bulk_name_tags.template.error_traced_svg_parse_failed'));
      }

      setSilhouetteTraceDebug(allDebug);
      setSilhouetteNormalizeIssues(allIssues);
      setSilhouetteTracedSvg(finalSvg);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('bulk_name_tags.template.error_tracing_failed'));
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSilhouetteUseAsTemplate = () => {
    if (!silhouetteTracedSvg) {
      setError(t('bulk_name_tags.template.error_no_traced_svg'));
      return;
    }
    setSelectedTemplateId('');
    onTemplateLoad(silhouetteTracedSvg);
    
    // Parse and set template size from the traced SVG
    try {
      const bounds = parseTemplateBounds(silhouetteTracedSvg);
      onTemplateSizeChange({
        width: bounds.width,
        height: bounds.height,
        lockAspect: true
      });
    } catch (error) {
      console.error('Failed to parse template bounds:', error);
    }
  };

  const handleAIGenerateRaw = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      setError(t('bulk_name_tags.template.error_prompt_required_template'));
      return;
    }

    setIsAiGenerating(true);
    setError('');
    setAiIssues([]);
    setAiDebugLines([]);
    setAiExtractedPreview('');
    setAiExtractedSnippet('');
    setAiRawResponse('');
    setAiExtractSource('');

    try {
      const res = await fetch('/api/bulk-name-tags/ai-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errJson: any = await res.json().catch(() => ({}));
          throw new Error(errJson?.error || t('bulk_name_tags.template.error_ai_generation_failed'));
        }
        const errText = await res.text().catch(() => '');
        throw new Error(errText || t('bulk_name_tags.template.error_ai_generation_failed'));
      }

      const data: any = await res.json();

      const responseText =
        (typeof data?.responseText === 'string' && data.responseText) ||
        (typeof data?.raw === 'string' && data.raw) ||
        (typeof data?.text === 'string' && data.text) ||
        (typeof data?.svg === 'string' && data.svg) ||
        '';

      setAiRawResponse(responseText);

      const extracted = extractSvgFromAiResponse(responseText);
      setAiExtractSource(extracted.source);
      setAiDebugLines(extracted.debug);

      if (!extracted.svg) {
        setAiExtractedSnippet('');
        throw new Error(t('bulk_name_tags.template.error_no_svg_in_ai_response'));
      }

      setAiExtractedSnippet(extracted.svg.slice(0, 200));

      const parsed = parseSvg(extracted.svg);
      if (!parsed.ok) {
        throw new Error(t('bulk_name_tags.template.error_ai_svg_parse_failed'));
      }

      const validation = validateLaserSafeSvg(extracted.svg);
      setAiExtractedPreview(validation.sanitizedSvg || extracted.svg);

      if (!validation.ok) {
        setAiIssues(validation.issues);
        throw new Error(t('bulk_name_tags.template.error_ai_svg_validation_failed'));
      }

      setSelectedTemplateId('');
      onTemplateLoad(validation.sanitizedSvg || extracted.svg);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('bulk_name_tags.template.error_ai_generation_failed'));
    } finally {
      setIsAiGenerating(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="text-xl font-semibold text-slate-100 mb-2">{t('bulk_name_tags.template.step_title')}</h2>
      <p className="text-sm text-slate-400 mb-4">
        {t('bulk_name_tags.template.desc')}
      </p>

      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-300 mb-1">
          {t('bulk_name_tags.template.choose_example_label')}
        </label>
        <select
          value={selectedTemplateId}
          onChange={handleExampleChange}
          className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">{t('bulk_name_tags.template.select_example_placeholder')}</option>
          {templateLibrary.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        {selectedTemplateId && (
          <p className="text-xs text-slate-500 mt-1">
            {templateLibrary.find(t => t.id === selectedTemplateId)?.description}
          </p>
        )}
      </div>

      {/* Template preview - shown right after template selection */}
      {templateSvg && (
        <>
          <div className="mb-4 rounded-md border border-slate-700 bg-slate-100 p-3">
            <p className="text-sm font-medium text-green-700 mb-2">{t('bulk_name_tags.template.template_loaded')}</p>
            <div className="max-h-32 overflow-auto">
              <div
                dangerouslySetInnerHTML={{ __html: templateSvg }}
                className="flex justify-center [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:block"
              />
            </div>
          </div>

          {/* Template size controls - always show if template is loaded */}
          {(() => {
            let bounds: { width: number; height: number } | null = null;
            try {
              const parsed = parseTemplateBounds(templateSvg);
              bounds = { width: parsed.width, height: parsed.height };
            } catch {
              bounds = null;
            }

            const aspect = bounds ? bounds.width / bounds.height : null;

            return (
              <div className="mb-4 rounded-md border border-slate-700 bg-slate-900/60 p-3">
                <h3 className="text-sm font-semibold text-slate-200 mb-2">{t('bulk_name_tags.template.size_title')}</h3>

                {bounds && (
                  <div className="text-xs text-slate-400 mb-3">
                    {t('bulk_name_tags.template.size_current_prefix')} {Number(toDisplay(bounds.width).toFixed(unitSystem === 'in' ? 3 : 1))}{unitSystem} × {Number(toDisplay(bounds.height).toFixed(unitSystem === 'in' ? 3 : 1))}{unitSystem}
                  </div>
                )}

                {templateSize && bounds && (
                  <div className="text-xs text-slate-400 mb-3">
                    {t('bulk_name_tags.template.size_scaled_prefix')} {Number(toDisplay(templateSize.width).toFixed(unitSystem === 'in' ? 3 : 1))}{unitSystem} × {Number(toDisplay(templateSize.height).toFixed(unitSystem === 'in' ? 3 : 1))}{unitSystem}
                  </div>
                )}

                {!templateSize && bounds && (
                  <button
                    type="button"
                    onClick={() => {
                      onTemplateSizeChange({
                        width: bounds.width,
                        height: bounds.height,
                        lockAspect: true
                      });
                    }}
                    className="mb-3 px-3 py-1.5 text-xs rounded-md border border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800"
                  >
                    {t('bulk_name_tags.template.size_enable_custom')}
                  </button>
                )}

                {templateSize && bounds && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {t('bulk_name_tags.template.size_width').replace('{unit}', unitSystem)}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step={unitSystem === 'in' ? '0.01' : '0.5'}
                      value={Number(toDisplay(templateSize.width).toFixed(unitSystem === 'in' ? 3 : 1))}
                      onChange={(e) => {
                        const nextWidth = fromDisplay(Number(e.target.value));
                        if (!aspect || !templateSize.lockAspect) {
                          onTemplateSizeChange({ ...templateSize, width: nextWidth });
                          return;
                        }
                        onTemplateSizeChange({ ...templateSize, width: nextWidth, height: nextWidth / aspect });
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {t('bulk_name_tags.template.size_height').replace('{unit}', unitSystem)}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step={unitSystem === 'in' ? '0.01' : '0.5'}
                      value={Number(toDisplay(templateSize.height).toFixed(unitSystem === 'in' ? 3 : 1))}
                      onChange={(e) => {
                        const nextHeight = fromDisplay(Number(e.target.value));
                        if (!aspect || !templateSize.lockAspect) {
                          onTemplateSizeChange({ ...templateSize, height: nextHeight });
                          return;
                        }
                        onTemplateSizeChange({ ...templateSize, height: nextHeight, width: nextHeight * aspect });
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={templateSize.lockAspect}
                      onChange={(e) => onTemplateSizeChange({ ...templateSize, lockAspect: e.target.checked })}
                      className="h-3 w-3 text-sky-600 focus:ring-sky-500 border-slate-700 rounded"
                    />
                    {t('bulk_name_tags.template.size_lock_aspect')}
                  </label>

                  {bounds && (
                    <button
                      type="button"
                      onClick={() => {
                        onTemplateSizeChange({ width: bounds.width, height: bounds.height, lockAspect: templateSize.lockAspect });
                      }}
                      className="px-2 py-1 text-xs rounded-md border border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800"
                    >
                      {t('bulk_name_tags.template.size_reset')}
                    </button>
                  )}
                </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* Manual hole controls */}
          <div className="mb-4 rounded-md border border-slate-700 bg-slate-900/60 p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-200">{t('bulk_name_tags.template.hole_title')}</h3>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={holeConfig.enabled}
                  onChange={(e) => onHoleConfigChange({ ...holeConfig, enabled: e.target.checked })}
                  className="h-3 w-3 text-sky-600 focus:ring-sky-500 border-slate-700 rounded"
                />
                {t('bulk_name_tags.template.hole_enable')}
              </label>
            </div>

            {holeConfig.enabled && (() => {
              let maxX = 100;
              let maxY = 100;
              try {
                const bounds = parseTemplateBounds(templateSvg);
                maxX = bounds.width;
                maxY = bounds.height;
              } catch {
                // Use defaults
              }

              return (
                <div className="space-y-3">
                  {/* X Position Slider */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-300">
                        {t('bulk_name_tags.template.hole_x_position').replace('{unit}', unitSystem)}
                      </label>
                      <span className="text-xs text-slate-400">
                        {unitSystem === 'in' ? (holeConfig.x / 25.4).toFixed(2) : holeConfig.x.toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={maxX}
                      step={unitSystem === 'in' ? maxX / 100 : 0.5}
                      value={holeConfig.x}
                      onChange={(e) => onHoleConfigChange({ ...holeConfig, x: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  {/* Y Position Slider */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-300">
                        {t('bulk_name_tags.template.hole_y_position').replace('{unit}', unitSystem)}
                      </label>
                      <span className="text-xs text-slate-400">
                        {unitSystem === 'in' ? (holeConfig.y / 25.4).toFixed(2) : holeConfig.y.toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={maxY}
                      step={unitSystem === 'in' ? maxY / 100 : 0.5}
                      value={holeConfig.y}
                      onChange={(e) => onHoleConfigChange({ ...holeConfig, y: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  {/* Radius Slider */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-300">
                        {t('bulk_name_tags.template.hole_size').replace('{unit}', unitSystem)}
                      </label>
                      <span className="text-xs text-slate-400">
                        {unitSystem === 'in' ? (holeConfig.radius / 25.4).toFixed(2) : holeConfig.radius.toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="10"
                      step="0.1"
                      value={holeConfig.radius}
                      onChange={(e) => onHoleConfigChange({ ...holeConfig, radius: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  <p className="text-xs text-slate-400">
                    {t('bulk_name_tags.template.hole_position_hint')}
                  </p>
                </div>
              );
            })()}
          </div>
        </>
      )}

      <div className="mb-4 border-t border-slate-800 pt-4">
        <h3 className="text-sm font-semibold text-slate-200 mb-2">{t('bulk_name_tags.template.ai_title')}</h3>
        <p className="text-xs text-slate-400 mb-3">{t('bulk_name_tags.template.ai_desc')}</p>


        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder={t('bulk_name_tags.template.ai_prompt_placeholder')}
            className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
          />

          <div className="flex flex-col gap-2">
            {!silhouetteConfigured && silhouetteConfigMessage && (
              <div className="rounded-md border border-amber-800 bg-amber-950/30 p-3 mb-2">
                <p className="text-xs text-amber-200">{silhouetteConfigMessage}</p>
              </div>
            )}
            <button
              type="button"
              onClick={handleSilhouetteGenerate}
              disabled={isAiGenerating || !silhouetteConfigured}
              className="px-4 py-2 rounded-md bg-sky-600 text-white font-medium disabled:opacity-60"
            >
              {isAiGenerating ? t('bulk_name_tags.template.ai_generating') : t('bulk_name_tags.template.ai_generate_silhouette')}
            </button>
          </div>
        </div>

        {silhouetteImageDataUrl && (
          <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/40 p-3">
            <p className="text-xs text-slate-400 mb-2">{t('bulk_name_tags.template.ai_silhouette_image_title')}</p>
            <div className="max-h-40 overflow-auto flex justify-center bg-slate-900 rounded p-2">
              <img src={silhouetteImageDataUrl} alt="Silhouette" className="max-w-full h-auto" />
            </div>
          </div>
        )}

        {silhouetteImageDataUrl && (
          <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/40 p-3">
            <p className="text-sm font-semibold text-slate-200 mb-3">{t('bulk_name_tags.template.trace_settings_title')}</p>
            <div className="mb-3">
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={silhouetteUsePotrace}
                  onChange={(e) => setSilhouetteUsePotrace(e.target.checked)}
                  className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-700 rounded"
                />
                {t('bulk_name_tags.template.trace_use_potrace')}
              </label>
            </div>

            {silhouetteUsePotrace ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t('bulk_name_tags.template.trace_threshold').replace('{value}', String(silhouettePotraceThreshold))}
                  </label>
                  <input
                    type="range"
                    min="80"
                    max="220"
                    value={silhouettePotraceThreshold}
                    onChange={(e) => setSilhouettePotraceThreshold(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">{t('bulk_name_tags.template.trace_denoise')}</label>
                  <select
                    value={silhouettePotraceDenoise}
                    onChange={(e) => setSilhouettePotraceDenoise(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value={0}>{t('bulk_name_tags.template.trace_denoise_0')}</option>
                    <option value={1}>{t('bulk_name_tags.template.trace_denoise_1')}</option>
                    <option value={2}>{t('bulk_name_tags.template.trace_denoise_2')}</option>
                    <option value={3}>{t('bulk_name_tags.template.trace_denoise_3')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t('bulk_name_tags.template.trace_simplify').replace('{value}', silhouettePotraceOptTolerance.toFixed(2))}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={silhouettePotraceOptTolerance}
                    onChange={(e) => setSilhouettePotraceOptTolerance(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={silhouettePotraceAutoInvert}
                      onChange={(e) => setSilhouettePotraceAutoInvert(e.target.checked)}
                      className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-700 rounded"
                    />
                    {t('bulk_name_tags.template.trace_auto_invert')}
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={silhouettePotraceInvert}
                      onChange={(e) => setSilhouettePotraceInvert(e.target.checked)}
                      className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-700 rounded"
                    />
                    {t('bulk_name_tags.template.trace_force_invert')}
                  </label>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">{t('bulk_name_tags.template.trace_detail')}</label>
                    <select
                      value={silhouetteTraceDetail}
                      onChange={(e) => setSilhouetteTraceDetail(e.target.value as TraceDetail)}
                      className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="low">{t('bulk_name_tags.template.trace_detail_low')}</option>
                      <option value="medium">{t('bulk_name_tags.template.trace_detail_medium')}</option>
                      <option value="high">{t('bulk_name_tags.template.trace_detail_high')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {t('bulk_name_tags.template.trace_threshold').replace('{value}', String(silhouetteThreshold))}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={silhouetteThreshold}
                      onChange={(e) => setSilhouetteThreshold(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={silhouetteRemoveSpecks}
                      onChange={(e) => setSilhouetteRemoveSpecks(e.target.checked)}
                      className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-700 rounded"
                    />
                    {t('bulk_name_tags.template.trace_remove_specks')}
                  </label>
                </div>
              </>
            )}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleSilhouetteTrace}
                disabled={isAiGenerating}
                className="px-4 py-2 rounded-md bg-sky-600 text-white font-medium disabled:opacity-60"
              >
                {isAiGenerating ? t('bulk_name_tags.template.trace_tracing') : t('bulk_name_tags.template.trace_convert_to_svg')}
              </button>
              {silhouetteTracedSvg && (
                <button
                  type="button"
                  onClick={handleSilhouetteUseAsTemplate}
                  className="px-4 py-2 rounded-md border border-slate-700 bg-slate-950 text-slate-200 font-medium"
                >
                  {t('bulk_name_tags.template.trace_use_as_template')}
                </button>
              )}
            </div>
          </div>
        )}


        {silhouetteNormalizeIssues.length > 0 && (
          <div className="mt-3 rounded-md border border-sky-800 bg-sky-950/30 p-3">
            <p className="text-sm font-semibold text-sky-200 mb-2">{t('bulk_name_tags.template.processing_info_title')}</p>
            <ul className="list-disc pl-5 text-xs text-sky-200">
              {silhouetteNormalizeIssues.map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {silhouetteTracedSvg && (
          <div className="mt-3 rounded-md border border-slate-800 bg-slate-100 p-3">
            <p className="text-xs text-slate-600 mb-2">{t('bulk_name_tags.template.traced_svg_preview_title')}</p>
            <div
              className="max-h-40 overflow-auto flex justify-center [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:block"
              dangerouslySetInnerHTML={{ __html: silhouetteTracedSvg }}
            />
          </div>
        )}
      </div>

      <input
        type="file"
        accept=".svg"
        onChange={handleFileChange}
        className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-sky-500/10 file:text-sky-400 hover:file:bg-sky-500/20"
      />

      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}
    </div>
  );
}
