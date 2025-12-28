import { useState, useEffect } from 'react';
import { templateLibrary } from '../templateLibrary';
import { parseTemplateBounds } from '../utils/svgUtils';
import { validateLaserSafeSvg } from '../utils/aiTemplateUtils';
import { extractSvgFromAiResponse } from '../../core/extractSvgFromAi';
import { formatShapeSpecSummary, parseShapeSpec, shapeSpecToSvg, type ShapeSpec } from '../../core/aiShapeSpec';
import { generateSilhouetteImage, getSilhouetteAiStatus } from '../../core/generateSilhouetteImage';
import { traceImageToSvg, type TraceDetail } from '../../core/traceImageToSvg';
import { normalizeImage } from '../../core/imageNormalize';
import { wrapTracedSvg } from '../../core/wrapTracedSvg';
import type { TemplateSizeConfig, UnitSystem } from '../types';

interface TemplateUploadProps {
  onTemplateLoad: (svg: string) => void;
  templateSvg: string | null;
  unitSystem: UnitSystem;
  templateSize: TemplateSizeConfig | null;
  onTemplateSizeChange: (next: TemplateSizeConfig | null) => void;
}

export function TemplateUpload({ onTemplateLoad, templateSvg, unitSystem, templateSize, onTemplateSizeChange }: TemplateUploadProps) {
  const [error, setError] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiMode, setAiMode] = useState<'smart' | 'raw' | 'silhouette'>('silhouette');

  const [silhouetteConfigured, setSilhouetteConfigured] = useState<boolean>(false);
  const [silhouetteConfigMessage, setSilhouetteConfigMessage] = useState<string>('');
  const [silhouetteImageDataUrl, setSilhouetteImageDataUrl] = useState<string>('');
  const [silhouetteTraceDetail, setSilhouetteTraceDetail] = useState<TraceDetail>('medium');
  const [silhouetteThreshold, setSilhouetteThreshold] = useState<number>(128);
  const [silhouetteRemoveSpecks, setSilhouetteRemoveSpecks] = useState<boolean>(true);
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
      setError('Please upload an SVG file');
      return;
    }

    try {
      const text = await file.text();
      if (!text.includes('<svg')) {
        setError('Invalid SVG file');
        return;
      }
      setError('');
      setSelectedTemplateId('');
      onTemplateLoad(text);
    } catch {
      setError('Failed to read file');
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
      setSilhouetteConfigMessage('Failed to check AI configuration');
    });
  }, []);

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
      setError('Please enter a prompt for the AI template');
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
          throw new Error(errJson?.error || 'AI generation failed');
        }
        const errText = await res.text().catch(() => '');
        throw new Error(errText || 'AI generation failed');
      }

      const data: any = await res.json();
      const responseText = (typeof data?.responseText === 'string' && data.responseText) || '';
      setSmartRawResponse(responseText);

      const parsed = parseShapeSpec(responseText);
      if (!parsed.spec) {
        setSmartErrors(parsed.errors.length ? parsed.errors : ['Could not parse shape specification']);
        throw new Error('AI did not return valid JSON. See errors below.');
      }

      setSmartWarnings(parsed.errors);
      setSmartSpec(parsed.spec);

      const svg = shapeSpecToSvg(parsed.spec);
      const parsedSvg = parseSvg(svg);
      if (!parsedSvg.ok) {
        setSmartErrors(['Generated SVG could not be parsed']);
        throw new Error('Generated SVG could not be parsed');
      }

      const validation = validateLaserSafeSvg(svg);
      setSmartGeneratedPreview(validation.sanitizedSvg || svg);
      if (!validation.ok) {
        setSmartErrors(validation.issues);
        throw new Error('Generated SVG failed validation');
      }

      const summary = formatShapeSpecSummary(parsed.spec);
      setSmartSummaryLines(summary.lines);

      setSelectedTemplateId('');
      onTemplateLoad(validation.sanitizedSvg || svg);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI generation failed');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSilhouetteGenerate = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      setError('Please enter a prompt for the AI silhouette');
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Silhouette generation failed');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSilhouetteTrace = async () => {
    if (!silhouetteImageDataUrl) {
      setError('No image to trace');
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
        allIssues.push('Image auto-rotated to landscape orientation');
      }

      const traceResult = await traceImageToSvg(normalizeResult.dataUrl, {
        detail: silhouetteTraceDetail,
        threshold: silhouetteThreshold,
        removeSpecks: silhouetteRemoveSpecks,
      });

      allDebug.push(...traceResult.debug);

      const targetW = templateSize?.width || 80;
      const targetH = templateSize?.height || 30;

      const wrapResult = wrapTracedSvg(traceResult.svg, {
        targetWidthMm: targetW,
        targetHeightMm: targetH,
        canvasWidth: traceResult.canvasWidth,
        canvasHeight: traceResult.canvasHeight,
        marginMm: 2,
      });

      allIssues.push(...wrapResult.issues);

      if (!wrapResult.svg) {
        throw new Error('SVG wrapping failed');
      }

      const parsed = parseSvg(wrapResult.svg);
      if (!parsed.ok) {
        throw new Error('Traced SVG could not be parsed');
      }

      setSilhouetteTraceDebug(allDebug);
      setSilhouetteNormalizeIssues(allIssues);
      setSilhouetteTracedSvg(wrapResult.svg);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tracing failed');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSilhouetteUseAsTemplate = () => {
    if (!silhouetteTracedSvg) {
      setError('No traced SVG to use');
      return;
    }
    setSelectedTemplateId('');
    onTemplateLoad(silhouetteTracedSvg);
  };

  const handleAIGenerateRaw = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      setError('Please enter a prompt for the AI template');
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
          throw new Error(errJson?.error || 'AI generation failed');
        }
        const errText = await res.text().catch(() => '');
        throw new Error(errText || 'AI generation failed');
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
        throw new Error('No SVG found in AI response');
      }

      setAiExtractedSnippet(extracted.svg.slice(0, 200));

      const parsed = parseSvg(extracted.svg);
      if (!parsed.ok) {
        throw new Error('SVG could not be parsed');
      }

      const validation = validateLaserSafeSvg(extracted.svg);
      setAiExtractedPreview(validation.sanitizedSvg || extracted.svg);

      if (!validation.ok) {
        setAiIssues(validation.issues);
        throw new Error('AI generated SVG, but it failed validation. See issues below.');
      }

      setSelectedTemplateId('');
      onTemplateLoad(validation.sanitizedSvg || extracted.svg);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI generation failed');
    } finally {
      setIsAiGenerating(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="text-xl font-semibold text-slate-100 mb-2">Step 1: Upload Template</h2>
      <p className="text-sm text-slate-400 mb-4">
        Upload your base SVG template (tag/badge/ornament shape). The template should use millimeters as units.
      </p>

      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Or choose an example template
        </label>
        <select
          value={selectedTemplateId}
          onChange={handleExampleChange}
          className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">-- Select an example --</option>
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

      <div className="mb-4 border-t border-slate-800 pt-4">
        <h3 className="text-sm font-semibold text-slate-200 mb-2">Generate template with AI</h3>
        <p className="text-xs text-slate-400 mb-3">Describe the tag shape you want.</p>

        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => {
              setAiMode('silhouette');
              resetAiState();
            }}
            className={
              aiMode === 'silhouette'
                ? 'px-3 py-1 rounded-md bg-sky-600 text-white text-xs font-semibold'
                : 'px-3 py-1 rounded-md border border-slate-700 bg-slate-950 text-slate-200 text-xs'
            }
          >
            AI Silhouette (Recommended)
          </button>
          <button
            type="button"
            onClick={() => {
              setAiMode('smart');
              resetAiState();
            }}
            className={
              aiMode === 'smart'
                ? 'px-3 py-1 rounded-md bg-sky-600 text-white text-xs font-semibold'
                : 'px-3 py-1 rounded-md border border-slate-700 bg-slate-950 text-slate-200 text-xs'
            }
          >
            Smart (JSON spec)
          </button>
          <button
            type="button"
            onClick={() => {
              setAiMode('raw');
              resetAiState();
            }}
            className={
              aiMode === 'raw'
                ? 'px-3 py-1 rounded-md bg-sky-600 text-white text-xs font-semibold'
                : 'px-3 py-1 rounded-md border border-slate-700 bg-slate-950 text-slate-200 text-xs'
            }
          >
            Raw SVG (Experimental)
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Describe the shape..."
            className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
          />

          {aiMode === 'silhouette' ? (
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
                {isAiGenerating ? 'Generating…' : 'Generate Silhouette'}
              </button>
            </div>
          ) : aiMode === 'smart' ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => handleAIGenerateSmart()}
                disabled={isAiGenerating}
                className="px-4 py-2 rounded-md bg-sky-600 text-white font-medium disabled:opacity-60"
              >
                {isAiGenerating ? 'Generating…' : 'Generate (Smart)'}
              </button>
              <button
                type="button"
                onClick={() => handleAIGenerateSmart({ simpler: true })}
                disabled={isAiGenerating}
                className="px-4 py-2 rounded-md border border-slate-700 bg-slate-950 text-slate-200 font-medium disabled:opacity-60"
              >
                Retry (simpler)
              </button>
              <button
                type="button"
                onClick={handleUseFallback}
                disabled={isAiGenerating}
                className="px-4 py-2 rounded-md border border-slate-700 bg-slate-950 text-slate-200 font-medium disabled:opacity-60"
              >
                Use Rounded Rectangle fallback
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAIGenerateRaw}
              disabled={isAiGenerating}
              className="px-4 py-2 rounded-md bg-sky-600 text-white font-medium disabled:opacity-60"
            >
              {isAiGenerating ? 'Generating…' : 'Generate SVG with AI'}
            </button>
          )}
        </div>

        {aiMode === 'silhouette' ? (
          <>
            {silhouetteImageDataUrl && (
              <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/40 p-3">
                <p className="text-xs text-slate-400 mb-2">Generated silhouette image</p>
                <div className="max-h-40 overflow-auto flex justify-center bg-slate-900 rounded p-2">
                  <img src={silhouetteImageDataUrl} alt="Silhouette" className="max-w-full h-auto" />
                </div>
              </div>
            )}

            {silhouetteImageDataUrl && (
              <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/40 p-3">
                <p className="text-sm font-semibold text-slate-200 mb-3">Trace settings</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Detail</label>
                    <select
                      value={silhouetteTraceDetail}
                      onChange={(e) => setSilhouetteTraceDetail(e.target.value as TraceDetail)}
                      className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="low">Low (simple)</option>
                      <option value="medium">Medium (balanced)</option>
                      <option value="high">High (detailed)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Threshold: {silhouetteThreshold}
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
                    Remove small specks
                  </label>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleSilhouetteTrace}
                    disabled={isAiGenerating}
                    className="px-4 py-2 rounded-md bg-sky-600 text-white font-medium disabled:opacity-60"
                  >
                    {isAiGenerating ? 'Tracing…' : 'Convert to SVG'}
                  </button>
                  {silhouetteTracedSvg && (
                    <button
                      type="button"
                      onClick={handleSilhouetteUseAsTemplate}
                      className="px-4 py-2 rounded-md border border-slate-700 bg-slate-950 text-slate-200 font-medium"
                    >
                      Use as Template
                    </button>
                  )}
                </div>
              </div>
            )}

            {silhouetteTraceDebug.length > 0 && (
              <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/40 p-3">
                <p className="text-xs text-slate-400 mb-2">Trace debug</p>
                <ul className="list-disc pl-5 text-[11px] text-slate-200">
                  {silhouetteTraceDebug.map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
                </ul>
              </div>
            )}

            {silhouetteNormalizeIssues.length > 0 && (
              <div className="mt-3 rounded-md border border-sky-800 bg-sky-950/30 p-3">
                <p className="text-sm font-semibold text-sky-200 mb-2">Processing info</p>
                <ul className="list-disc pl-5 text-xs text-sky-200">
                  {silhouetteNormalizeIssues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {silhouetteTracedSvg && (
              <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/40 p-3">
                <p className="text-xs text-slate-400 mb-2">Traced SVG preview</p>
                <div
                  className="max-h-40 overflow-auto flex justify-center [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:block"
                  dangerouslySetInnerHTML={{ __html: silhouetteTracedSvg }}
                />
              </div>
            )}
          </>
        ) : aiMode === 'smart' ? (
          <>
            {smartSummaryLines.length > 0 && (
              <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/40 p-3">
                <p className="text-sm font-semibold text-slate-200 mb-2">Spec summary</p>
                <ul className="list-disc pl-5 text-xs text-slate-200">
                  {smartSummaryLines.map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
                </ul>
              </div>
            )}

            {smartWarnings.length > 0 && (
              <div className="mt-3 rounded-md border border-amber-800 bg-amber-950/30 p-3">
                <p className="text-sm font-semibold text-amber-200 mb-2">Spec warnings</p>
                <ul className="list-disc pl-5 text-xs text-amber-200">
                  {smartWarnings.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {smartErrors.length > 0 && (
              <div className="mt-3 rounded-md border border-red-800 bg-red-950/30 p-3">
                <p className="text-sm font-semibold text-red-200 mb-2">Errors</p>
                <ul className="list-disc pl-5 text-xs text-red-200">
                  {smartErrors.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>

                {smartRawResponse && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[11px] text-red-200">Raw AI response</summary>
                    <pre className="mt-2 text-[11px] whitespace-pre-wrap text-red-100">{smartRawResponse.slice(0, 300)}</pre>
                  </details>
                )}
              </div>
            )}

            {smartGeneratedPreview && (
              <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/40 p-3">
                <p className="text-xs text-slate-400 mb-2">Generated SVG preview</p>
                <div
                  className="max-h-40 overflow-auto flex justify-center [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:block"
                  dangerouslySetInnerHTML={{ __html: smartGeneratedPreview }}
                />
              </div>
            )}

            {smartRawResponse && smartErrors.length === 0 && (
              <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/40 p-3">
                <details>
                  <summary className="cursor-pointer text-[11px] text-slate-400">Raw AI response</summary>
                  <pre className="mt-2 text-[11px] whitespace-pre-wrap text-slate-200">{smartRawResponse.slice(0, 3000)}</pre>
                </details>
              </div>
            )}
          </>
        ) : (
          <>
            {aiIssues.length > 0 && (
              <div className="mt-3 rounded-md border border-amber-800 bg-amber-950/30 p-3">
                <p className="text-sm font-semibold text-amber-200 mb-2">Validation issues</p>
                <ul className="list-disc pl-5 text-xs text-amber-200">
                  {aiIssues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {aiExtractedPreview && (
              <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/40 p-3">
                <p className="text-xs text-slate-400 mb-2">Extracted SVG preview</p>
                <div
                  className="max-h-40 overflow-auto flex justify-center [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:block"
                  dangerouslySetInnerHTML={{ __html: aiExtractedPreview }}
                />
              </div>
            )}

            {(aiDebugLines.length > 0 || aiExtractedSnippet || aiRawResponse) && (
              <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/40 p-3">
                <p className="text-xs text-slate-400 mb-2">AI parse debug</p>

                {aiExtractSource && (
                  <p className="text-[11px] text-slate-300 mb-2">Source: {aiExtractSource}</p>
                )}

                {aiDebugLines.length > 0 && (
                  <ul className="list-disc pl-5 text-[11px] text-slate-200 mb-2">
                    {aiDebugLines.map((line, idx) => (
                      <li key={idx}>{line}</li>
                    ))}
                  </ul>
                )}

                {aiExtractedSnippet && (
                  <div className="mb-2">
                    <p className="text-[11px] text-slate-400 mb-1">Extracted SVG (first 200 chars)</p>
                    <pre className="text-[11px] whitespace-pre-wrap text-slate-200">{aiExtractedSnippet}</pre>
                  </div>
                )}

                {aiRawResponse && (
                  <details>
                    <summary className="cursor-pointer text-[11px] text-slate-400">Raw AI response</summary>
                    <pre className="mt-2 text-[11px] whitespace-pre-wrap text-slate-200">{aiRawResponse.slice(0, 3000)}</pre>
                  </details>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <input
        type="file"
        accept=".svg"
        onChange={handleFileChange}
        className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-sky-500/10 file:text-sky-400 hover:file:bg-sky-500/20"
      />

      {templateSvg && templateSize && (() => {
        let bounds: { width: number; height: number } | null = null;
        try {
          const parsed = parseTemplateBounds(templateSvg);
          bounds = { width: parsed.width, height: parsed.height };
        } catch {
          bounds = null;
        }

        const aspect = bounds ? bounds.width / bounds.height : null;

        return (
          <div className="mt-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-slate-200 mb-2">Template size</h3>

            {bounds && (
              <div className="text-xs text-slate-500 mb-3">
                Original: {Number(toDisplay(bounds.width).toFixed(unitSystem === 'in' ? 3 : 1))}{unitSystem} × {Number(toDisplay(bounds.height).toFixed(unitSystem === 'in' ? 3 : 1))}{unitSystem}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Width ({unitSystem})
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Height ({unitSystem})
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={templateSize.lockAspect}
                  onChange={(e) => onTemplateSizeChange({ ...templateSize, lockAspect: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                Lock aspect ratio
              </label>

              <button
                type="button"
                onClick={() => {
                  if (!bounds) return;
                  onTemplateSizeChange({ width: bounds.width, height: bounds.height, lockAspect: templateSize.lockAspect });
                }}
                className="px-3 py-2 text-sm rounded-md border border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800"
              >
                Reset to original
              </button>
            </div>
          </div>
        );
      })()}

      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}

      {templateSvg && (
        <div className="mt-4">
          <p className="text-sm font-medium text-green-600 mb-2">✓ Template loaded</p>
          <div className="border border-gray-200 rounded p-4 bg-gray-50 max-h-48 overflow-auto">
            <div
              dangerouslySetInnerHTML={{ __html: templateSvg }}
              className="flex justify-center [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:block"
            />
          </div>
        </div>
      )}
    </div>
  );
}
