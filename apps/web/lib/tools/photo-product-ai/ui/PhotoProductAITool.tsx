'use client';

import { useCallback, useRef, useState } from 'react';
import {
  Upload, Sparkles, Download, Image, Layers, DollarSign, Clock, Ruler,
  RotateCcw, Package, Eye, AlertTriangle, Shield, Palette, Box, Zap,
  ChevronDown, ChevronUp, LayoutGrid,
} from 'lucide-react';
import { useAnalytics } from '@/lib/analytics/useAnalytics';
import { useLanguage } from '@/lib/i18n/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';
import { refreshEntitlements } from '@/lib/entitlements/client';
import type {
  ProductType, ProcessingStage, GenerateOptions, GenerateResponse,
  MaterialId, StyleId,
} from '../types';
import {
  PRODUCT_TYPES, DEFAULT_OPTIONS, MATERIAL_PROFILES, STYLE_OPTIONS, MOCKUP_SCENES,
} from '../types';

type PreviewTab = 'engrave' | 'cut' | 'combined' | 'simulation' | 'multilayer' | 'mockups';

const STAGE_LABELS: Record<ProcessingStage, string> = {
  idle: '',
  uploading: 'Uploading...',
  enhancing: 'Enhancing photo...',
  'style-transform': 'Applying style...',
  'ai-generation': 'AI generating engraving...',
  multilayer: 'Generating layers...',
  'risk-analysis': 'Analyzing risks...',
  variants: 'Creating variants...',
  mockups: 'Rendering mockups...',
  complete: 'Complete!',
  error: 'Error occurred',
};

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_DIMENSION = 1536;

function resizeImageToBase64(dataUrl: string, maxDim = MAX_DIMENSION, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context failed')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      const resized = canvas.toDataURL('image/jpeg', quality);
      resolve(resized.split(',')[1]);
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = dataUrl;
  });
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export function PhotoProductAITool() {
  const analytics = useAnalytics('photo-product-ai');
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [selectedProduct, setSelectedProduct] = useState<ProductType>('engraved-frame');
  const [options, setOptions] = useState<GenerateOptions>({ ...DEFAULT_OPTIONS });
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<PreviewTab>('engrave');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedMockup, setSelectedMockup] = useState(0);
  const [selectedLayer, setSelectedLayer] = useState(0);

  const mat = MATERIAL_PROFILES[options.material];

  // ── File handling ──
  const handleFile = useCallback((file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) { setError('Please upload a JPG, PNG, or WEBP image.'); return; }
    if (file.size > MAX_FILE_SIZE) { setError('File too large. Maximum size is 15MB.'); return; }
    setError(null); setUploadedFileName(file.name); setResult(null); setStage('idle');
    const reader = new FileReader();
    reader.onload = (e) => setUploadedImage(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  }, [handleFile]);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) handleFile(f);
  }, [handleFile]);

  // ── Generate ──
  const handleGenerate = async () => {
    if (!uploadedImage) return;
    setError(null); setResult(null); analytics.trackAIGeneration();
    try {
      setStage('enhancing');
      const base64 = await resizeImageToBase64(uploadedImage);
      setStage('style-transform'); await delay(200);
      setStage('ai-generation');

      const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      const accessToken = typeof window !== 'undefined' ? window.localStorage.getItem('accessToken') : null;
      if (accessToken) authHeaders['Authorization'] = `Bearer ${accessToken}`;

      const response = await fetch('/api/ai/photo-product', {
        method: 'POST', headers: authHeaders, credentials: 'include',
        body: JSON.stringify({ imageBase64: base64, productType: selectedProduct, options }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || `Generation failed (${response.status})`);
      }

      setStage('risk-analysis'); await delay(200);
      const data: GenerateResponse = await response.json();
      setStage('variants'); await delay(150);
      setStage('mockups'); await delay(150);
      setResult(data); setStage('complete'); setPreviewTab('engrave');
      refreshEntitlements();
    } catch (err: any) {
      console.error('Photo product generation failed:', err);
      setError(err.message || 'Generation failed. Please try again.'); setStage('error');
    }
  };

  const handleReset = () => {
    setUploadedImage(null); setUploadedFileName(''); setResult(null); setStage('idle');
    setError(null); setOptions({ ...DEFAULT_OPTIONS }); setSelectedProduct('engraved-frame');
  };

  // ── Export helpers ──
  const svgForExport = (svg: string): string =>
    svg.replace(
      /viewBox="([^"]+)"\s+data-width-mm="([^"]+)"\s+data-height-mm="([^"]+)"/,
      'width="$2mm" height="$3mm" viewBox="$1"',
    );

  const b64toUint8 = (b64: string) => {
    const raw = atob(b64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  };

  const handleExportZip = async () => {
    if (!result) return;
    analytics.trackExport();
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      zip.file('engrave.svg', svgForExport(result.engraveSvg));
      zip.file('cut.svg', svgForExport(result.cutSvg));
      zip.file('combined.svg', svgForExport(result.combinedSvg));

      if (result.engravePreviewPng) zip.file('engrave-preview.png', b64toUint8(result.engravePreviewPng));

      if (result.multilayer) {
        const mlFolder = zip.folder('multilayer')!;
        result.multilayer.layers.forEach((l) =>
          mlFolder.file(`layer-${l.index + 1}.svg`, svgForExport(l.svg)),
        );
      }

      if (result.mockups?.length) {
        const mkFolder = zip.folder('mockups')!;
        result.mockups.forEach((m) => mkFolder.file(`${m.scene}.png`, b64toUint8(m.png)));
      }

      if (result.variants?.length) {
        const vFolder = zip.folder('variants')!;
        result.variants.forEach((v) => {
          vFolder.file(`${v.productType}-engrave.svg`, svgForExport(v.engraveSvg));
          vFolder.file(`${v.productType}-cut.svg`, svgForExport(v.cutSvg));
        });
      }

      zip.file('risk-report.json', JSON.stringify(result.riskWarnings, null, 2));
      zip.file('production-summary.json', JSON.stringify(result.productionInsights, null, 2));
      zip.file('product-description.txt', result.description);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `photo-product-${selectedProduct}-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Export failed. Please try again.');
    }
  };

  const handleDownloadSvg = (svgContent: string, filename: string) => {
    const blob = new Blob([svgForExport(svgContent)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const isProcessing = stage !== 'idle' && stage !== 'complete' && stage !== 'error';

  /* ═══ RENDER ═══ */
  return (
    <div className="flex h-full flex-col gap-4 lg:flex-row lg:gap-6">
      {/* ═══ LEFT PANEL — Controls ═══ */}
      <div className="w-full shrink-0 space-y-4 overflow-y-auto lg:w-[340px]">
        {/* Header */}
        <div>
          <h2 className="text-lg font-bold text-slate-100">Photo → Laser Product</h2>
          <p className="mt-1 text-xs text-slate-400">
            AI-powered laser product designer with material intelligence, style transforms, and production optimization.
          </p>
        </div>

        {/* Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
            isDragging
              ? 'border-sky-400 bg-sky-500/10'
              : uploadedImage
                ? 'border-emerald-600 bg-emerald-900/10'
                : 'border-slate-700 bg-slate-900/40 hover:border-slate-600'
          }`}
        >
          <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleFileInput} className="hidden" />
          {uploadedImage ? (
            <div className="space-y-2">
              <img src={uploadedImage} alt="Preview" className="mx-auto max-h-28 rounded-lg object-contain" />
              <p className="text-xs font-medium text-emerald-400">{uploadedFileName}</p>
              <p className="text-[10px] text-slate-500">Click or drop to replace</p>
            </div>
          ) : (
            <>
              <Upload className="mb-2 h-7 w-7 text-slate-500" />
              <p className="text-sm font-medium text-slate-300">Drop photo or click to upload</p>
              <p className="mt-1 text-[10px] text-slate-500">JPG, PNG, WEBP — max 15MB</p>
            </>
          )}
        </div>

        {uploadedImage && (
          <>
            {/* ── Material Selector ── */}
            <Section title="Material" icon={<Box className="h-3.5 w-3.5 text-amber-400" />}>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.entries(MATERIAL_PROFILES) as [MaterialId, typeof MATERIAL_PROFILES[MaterialId]][]).map(
                  ([id, m]) => (
                    <button
                      key={id}
                      onClick={() => setOptions((o) => ({ ...o, material: id, kerfMm: m.kerfCoefficient }))}
                      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] transition-colors ${
                        options.material === id
                          ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                          : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span>{m.icon}</span>
                      <span className="truncate font-medium">{m.label}</span>
                    </button>
                  ),
                )}
              </div>
              <div className="mt-2 flex gap-3 text-[10px] text-slate-500">
                <span>Kerf: {mat.kerfCoefficient}mm</span>
                <span>Thickness: {mat.thicknessMm}mm</span>
                <span>Cost: ${mat.costPerM2}/m²</span>
              </div>
            </Section>

            {/* ── Style Selector ── */}
            <Section title="Engraving Style" icon={<Palette className="h-3.5 w-3.5 text-violet-400" />}>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.entries(STYLE_OPTIONS) as [StyleId, typeof STYLE_OPTIONS[StyleId]][]).map(([id, s]) => (
                  <button
                    key={id}
                    onClick={() => setOptions((o) => ({ ...o, style: id }))}
                    className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] transition-colors ${
                      options.style === id
                        ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                        : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span>{s.icon}</span>
                    <span className="truncate font-medium">{s.label}</span>
                  </button>
                ))}
              </div>
            </Section>

            {/* ── Product Type ── */}
            <Section title="Product Type" icon={<LayoutGrid className="h-3.5 w-3.5 text-sky-400" />}>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.entries(PRODUCT_TYPES) as [ProductType, typeof PRODUCT_TYPES[ProductType]][]).map(
                  ([key, val]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedProduct(key)}
                      className={`rounded-lg border px-2 py-1.5 text-left text-[11px] transition-colors ${
                        selectedProduct === key
                          ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                          : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="mr-1">{val.icon}</span>
                      <span className="font-medium">{val.label}</span>
                      <span className="ml-1 text-[9px] text-slate-600">
                        {val.sizeMm[0]}x{val.sizeMm[1]}
                      </span>
                    </button>
                  ),
                )}
              </div>
            </Section>

            {/* ── AI Feature Toggles ── */}
            <Section title="AI Features" icon={<Zap className="h-3.5 w-3.5 text-yellow-400" />}>
              <div className="space-y-2">
                <Toggle label="Enhance Photo for Laser" checked={options.enhancePhoto} onChange={(v) => setOptions((o) => ({ ...o, enhancePhoto: v }))} />
                <Toggle label="Real Laser Preview" checked={options.realLaserPreview} onChange={(v) => setOptions((o) => ({ ...o, realLaserPreview: v }))} />
                <Toggle label="Generate Multilayer" checked={options.generateMultilayer} onChange={(v) => setOptions((o) => ({ ...o, generateMultilayer: v }))} />
                <Toggle label="Auto Product Variants" checked={options.generateVariants} onChange={(v) => setOptions((o) => ({ ...o, generateVariants: v }))} />
                <Toggle label="Enhance Composition" checked={options.enhanceComposition} onChange={(v) => setOptions((o) => ({ ...o, enhanceComposition: v }))} />
                <Toggle label="Invert Engraving" checked={options.invertEngraving} onChange={(v) => setOptions((o) => ({ ...o, invertEngraving: v }))} />
                <Toggle label="Include Cut Frame" checked={options.includeFrame} onChange={(v) => setOptions((o) => ({ ...o, includeFrame: v }))} />
              </div>
            </Section>

            {/* ── Advanced Options ── */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:bg-slate-800"
            >
              <span>Advanced Options</span>
              {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showAdvanced && (
              <div className="space-y-3 rounded-lg border border-slate-700 bg-slate-900/40 p-3">
                <SliderOption label="Kerf Offset" value={options.kerfMm} min={0} max={0.5} step={0.01} suffix="mm" onChange={(v) => setOptions((o) => ({ ...o, kerfMm: v }))} />
                <SliderOption label="Contrast" value={options.contrast} min={0} max={100} step={1} suffix="%" onChange={(v) => setOptions((o) => ({ ...o, contrast: v }))} />
                <SliderOption label="Edge Strength" value={options.edgeStrength} min={0} max={100} step={1} suffix="%" onChange={(v) => setOptions((o) => ({ ...o, edgeStrength: v }))} />
                <SliderOption label="Smoothing" value={options.smoothing} min={0} max={100} step={1} suffix="%" onChange={(v) => setOptions((o) => ({ ...o, smoothing: v }))} />
                <SliderOption label="Frame Padding" value={options.framePaddingMm} min={0} max={20} step={1} suffix="mm" onChange={(v) => setOptions((o) => ({ ...o, framePaddingMm: v }))} />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-3 text-xs text-red-300">{error}</div>
            )}

            {/* Generate Button */}
            <div className="space-y-2">
              <button
                onClick={handleGenerate}
                disabled={isProcessing}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-sky-600 hover:to-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {STAGE_LABELS[stage]}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {result ? 'Regenerate' : 'Generate Product'}
                  </>
                )}
              </button>
              {(result || uploadedImage) && (
                <button
                  onClick={handleReset}
                  disabled={isProcessing}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-400 hover:bg-slate-800 disabled:opacity-50"
                >
                  <RotateCcw className="h-3 w-3" /> Start Over
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* ═══ RIGHT PANEL — Preview & Results ═══ */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* AI Suggestions */}
        {result?.productSuggestions && result.productSuggestions.length > 0 && (
          <div className="mb-3">
            <h3 className="mb-2 text-xs font-semibold text-slate-300">AI Suggested Products</h3>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {result.productSuggestions.map((s) => (
                <button
                  key={s.type}
                  onClick={() => setSelectedProduct(s.type as ProductType)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                    selectedProduct === s.type
                      ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                      : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <span>{s.icon}</span>
                  <span className="font-medium">{s.label}</span>
                  <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500">
                    {Math.round(s.confidence * 100)}%
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Preview Tabs */}
        {result && (
          <div className="flex gap-0.5 overflow-x-auto border-b border-slate-700">
            {([
              { key: 'engrave' as const, label: 'Engrave', icon: Image },
              { key: 'cut' as const, label: 'Cut', icon: Layers },
              { key: 'combined' as const, label: 'Combined', icon: Eye },
              { key: 'simulation' as const, label: 'Laser Sim', icon: Zap },
              ...(result.multilayer ? [{ key: 'multilayer' as const, label: 'Multilayer', icon: Layers }] : []),
              { key: 'mockups' as const, label: 'Mockups', icon: Package },
            ]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setPreviewTab(key)}
                className={`flex shrink-0 items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
                  previewTab === key
                    ? 'border-b-2 border-sky-500 text-sky-400'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Preview Canvas */}
        <div className="flex flex-1 items-center justify-center overflow-auto rounded-b-xl bg-slate-900/50 p-4" style={{ minHeight: 380 }}>
          {/* Empty state */}
          {!uploadedImage && !isProcessing && (
            <div className="text-center">
              <Image className="mx-auto mb-3 h-12 w-12 text-slate-600" />
              <p className="text-sm text-slate-500">Upload a photo to get started</p>
              <p className="mt-1 text-xs text-slate-600">AI will generate laser-ready files, mockups, and production estimates</p>
            </div>
          )}

          {/* Uploaded but not generated */}
          {uploadedImage && !result && !isProcessing && (
            <div className="text-center">
              <img src={uploadedImage} alt="Preview" className="mx-auto max-h-[450px] max-w-full rounded-lg shadow-lg" />
              <p className="mt-3 text-sm text-slate-400">
                Click <strong>Generate Product</strong> to create laser files
              </p>
            </div>
          )}

          {/* Processing */}
          {isProcessing && (
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-sky-500" />
              <p className="text-sm font-medium text-slate-300">{STAGE_LABELS[stage]}</p>
              <div className="mx-auto mt-4 w-64">
                <ProgressBar stage={stage} />
              </div>
            </div>
          )}

          {/* ── Engrave Tab ── */}
          {result && previewTab === 'engrave' && (
            <div className="flex w-full flex-col items-center gap-3">
              <img
                src={`data:image/jpeg;base64,${result.engravePreviewPng}`}
                alt="Engrave"
                className="w-full max-w-2xl rounded-lg shadow-lg object-contain"
                style={options.invertEngraving ? { filter: 'invert(1)' } : undefined}
              />
              <button
                onClick={() => handleDownloadSvg(result.engraveSvg, 'engrave.svg')}
                className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-xs text-slate-100 hover:bg-slate-600"
              >
                <Download className="h-3.5 w-3.5" /> Download Engrave SVG
              </button>
            </div>
          )}

          {/* ── Cut Tab ── */}
          {result && previewTab === 'cut' && (
            <div className="flex w-full flex-col items-center gap-3">
              <div
                className="w-full max-w-2xl overflow-auto rounded-lg border border-slate-700 bg-white p-4 [&>svg]:h-auto [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: result.cutSvg }}
              />
              <button
                onClick={() => handleDownloadSvg(result.cutSvg, 'cut.svg')}
                className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-xs text-slate-100 hover:bg-slate-600"
              >
                <Download className="h-3.5 w-3.5" /> Download Cut SVG
              </button>
            </div>
          )}

          {/* ── Combined Tab ── */}
          {result && previewTab === 'combined' && (
            <div className="flex w-full flex-col items-center gap-3">
              <div
                className="w-full max-w-2xl overflow-auto rounded-lg border border-slate-700 bg-white p-2 [&>svg]:h-auto [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: result.combinedSvg }}
              />
              <button
                onClick={() => handleDownloadSvg(result.combinedSvg, 'combined.svg')}
                className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-xs text-slate-100 hover:bg-slate-600"
              >
                <Download className="h-3.5 w-3.5" /> Download Combined SVG
              </button>
            </div>
          )}

          {/* ── Laser Simulation Tab ── */}
          {result && previewTab === 'simulation' && (
            <div className="flex w-full flex-col items-center gap-3">
              <div className="relative w-full max-w-2xl">
                <div className="rounded-xl p-4 shadow-2xl" style={{ backgroundColor: mat.color }}>
                  <img
                    src={`data:image/jpeg;base64,${result.laserSimulationPng || result.engravePreviewPng}`}
                    alt="Laser simulation"
                    className="w-full rounded-lg object-contain mix-blend-multiply"
                    style={{ filter: `contrast(${mat.engravingContrastCurve}) sepia(0.3) saturate(0.7)`, opacity: 0.85 }}
                  />
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-800 px-3 py-1 text-[10px] font-medium text-slate-400 shadow">
                  Simulated on {mat.label} — burn spread {mat.burnSpreadFactor}x
                </div>
              </div>
            </div>
          )}

          {/* ── Multilayer Tab ── */}
          {result && previewTab === 'multilayer' && result.multilayer && (
            <div className="flex w-full flex-col items-center gap-3">
              <div className="flex gap-2 mb-2">
                {result.multilayer.layers.map((l, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedLayer(i)}
                    className={`rounded-lg border px-3 py-1.5 text-xs ${
                      selectedLayer === i
                        ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                        : 'border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {l.label} ({l.depthPercent}%)
                  </button>
                ))}
              </div>
              <div
                className="w-full max-w-2xl overflow-auto rounded-lg border border-slate-700 bg-white p-2 [&>svg]:h-auto [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: result.multilayer.layers[selectedLayer]?.svg || '' }}
              />
              <button
                onClick={() => {
                  const l = result.multilayer!.layers[selectedLayer];
                  if (l) handleDownloadSvg(l.svg, `layer-${l.index + 1}.svg`);
                }}
                className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-xs text-slate-100 hover:bg-slate-600"
              >
                <Download className="h-3.5 w-3.5" /> Download Layer SVG
              </button>
            </div>
          )}

          {/* ── Mockups Tab ── */}
          {result && previewTab === 'mockups' && result.mockups && result.mockups.length > 0 && (
            <div className="flex w-full flex-col items-center gap-3">
              <div className="flex gap-2 mb-2">
                {result.mockups.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedMockup(i)}
                    className={`rounded-lg border px-3 py-1.5 text-xs ${
                      selectedMockup === i
                        ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                        : 'border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {MOCKUP_SCENES[m.scene as keyof typeof MOCKUP_SCENES]?.icon} {m.label}
                  </button>
                ))}
              </div>
              <div className="relative w-full max-w-2xl">
                <div className="rounded-xl bg-gradient-to-br from-amber-900/40 via-amber-800/30 to-amber-900/40 p-6 shadow-2xl">
                  <img
                    src={`data:image/jpeg;base64,${result.mockups[selectedMockup]?.png}`}
                    alt="Mockup"
                    className="w-full rounded-lg object-contain"
                    style={options.invertEngraving ? { filter: 'invert(1)' } : undefined}
                  />
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-800 px-3 py-1 text-[10px] font-medium text-slate-400 shadow">
                  {result.mockups[selectedMockup]?.label} Mockup
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ BOTTOM PANELS ═══ */}
        {result && (
          <div className="mt-4 space-y-4">
            {/* Risk Analysis */}
            {result.riskWarnings && result.riskWarnings.length > 0 && (
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <Shield className="h-4 w-4 text-orange-400" /> Risk Analysis
                </h3>
                <div className="space-y-1.5">
                  {result.riskWarnings.map((w, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2 rounded-lg p-2 text-xs ${
                        w.severity === 'high'
                          ? 'bg-red-900/20 text-red-300'
                          : w.severity === 'medium'
                            ? 'bg-amber-900/20 text-amber-300'
                            : 'bg-emerald-900/20 text-emerald-300'
                      }`}
                    >
                      <AlertTriangle
                        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                          w.severity === 'high'
                            ? 'text-red-400'
                            : w.severity === 'medium'
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                        }`}
                      />
                      <span>{w.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Product Variants */}
            {result.variants && result.variants.length > 0 && (
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <LayoutGrid className="h-4 w-4 text-violet-400" /> Product Variants
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {result.variants.map((v) => (
                    <div key={v.productType} className="rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-center">
                      <img
                        src={`data:image/jpeg;base64,${v.previewPng}`}
                        alt={v.label}
                        className="mx-auto mb-1.5 h-16 w-16 rounded object-contain"
                        style={options.invertEngraving ? { filter: 'invert(1)' } : undefined}
                      />
                      <p className="text-[11px] font-medium text-slate-200">
                        {v.icon} {v.label}
                      </p>
                      <p className="text-[9px] text-slate-500">
                        {v.sizeMm[0]}x{v.sizeMm[1]}mm
                      </p>
                      <button
                        onClick={() => handleDownloadSvg(v.engraveSvg, `${v.productType}-engrave.svg`)}
                        className="mt-1.5 flex w-full items-center justify-center gap-1 rounded bg-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-600"
                      >
                        <Download className="h-2.5 w-2.5" /> SVG
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Production Insights + Size + Export */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* Production Insights */}
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-400" /> Production Insights
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <InsightItem icon={<Ruler className="h-3 w-3 text-sky-400" />} label="Size" value={`${result.productionInsights.materialWidthMm}x${result.productionInsights.materialHeightMm}mm`} />
                  <InsightItem icon={<Clock className="h-3 w-3 text-amber-400" />} label="Time" value={`~${result.productionInsights.estimatedTimeMinutes} min`} />
                  <InsightItem icon={<DollarSign className="h-3 w-3 text-emerald-400" />} label="Cost" value={`$${result.productionInsights.materialCostEstimate.toFixed(2)}`} />
                  <InsightItem icon={<DollarSign className="h-3 w-3 text-violet-400" />} label="Price" value={`$${result.productionInsights.recommendedPrice.toFixed(2)}`} />
                  <InsightItem icon={<Layers className="h-3 w-3 text-orange-400" />} label="Cut Path" value={`${result.productionInsights.cutPathLengthMm}mm`} />
                  <InsightItem icon={<Ruler className="h-3 w-3 text-pink-400" />} label="Kerf" value={`${result.productionInsights.optimalKerf}mm`} />
                </div>
              </div>

              {/* Size Recommendation */}
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Ruler className="h-3.5 w-3.5 text-sky-400" /> Size Recommendation
                </h3>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Optimal Size</span>
                    <span className="font-medium">{result.sizeRecommendation.widthMm} x {result.sizeRecommendation.heightMm}mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kerf</span>
                    <span className="font-medium">{result.sizeRecommendation.optimalKerf}mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Thickness</span>
                    <span className="font-medium">{result.sizeRecommendation.materialThickness}mm</span>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">{result.sizeRecommendation.reason}</p>
                </div>
              </div>

              {/* Export Panel */}
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Package className="h-3.5 w-3.5 text-sky-400" /> Export Product Pack
                </h3>
                <p className="mb-3 text-[10px] text-slate-400">
                  Complete ZIP with SVGs, mockups, multilayer, variants, risk report, and production summary.
                </p>
                <button
                  onClick={handleExportZip}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  <Download className="h-3.5 w-3.5" /> Download Product Pack (.zip)
                </button>
                <div className="mt-3 space-y-1">
                  <ExportFileRow name="engrave.svg" desc="Engraving layer" />
                  <ExportFileRow name="cut.svg" desc="Cut outline" />
                  <ExportFileRow name="combined.svg" desc="Engrave + Cut" />
                  {result.multilayer && <ExportFileRow name="multilayer/" desc="Layer SVGs" />}
                  <ExportFileRow name="mockups/" desc="Scene PNGs" />
                  {result.variants?.length > 0 && <ExportFileRow name="variants/" desc="Variant SVGs" />}
                  <ExportFileRow name="risk-report.json" desc="Risk analysis" />
                  <ExportFileRow name="production-summary.json" desc="Cost & time" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
      <span>{label}</span>
      <div
        onClick={(e) => { e.preventDefault(); onChange(!checked); }}
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? 'bg-sky-500' : 'bg-slate-700'}`}
      >
        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
    </label>
  );
}

function SliderOption({
  label, value, min, max, step, suffix, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-300">{label}</label>
        <span className="text-xs text-slate-500">{step < 1 ? value.toFixed(2) : value}{suffix}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-sky-500"
      />
    </div>
  );
}

function InsightItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-800/50 p-2">
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">{icon}{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-200">{value}</div>
    </div>
  );
}

function ExportFileRow({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="font-mono text-slate-300">{name}</span>
      <span className="text-slate-500">{desc}</span>
    </div>
  );
}

function ProgressBar({ stage }: { stage: ProcessingStage }) {
  const stages: ProcessingStage[] = ['enhancing', 'style-transform', 'ai-generation', 'risk-analysis', 'variants', 'mockups', 'complete'];
  const idx = stages.indexOf(stage);
  const pct = idx < 0 ? 0 : Math.round(((idx + 1) / stages.length) * 100);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
      <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-violet-500 transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}
