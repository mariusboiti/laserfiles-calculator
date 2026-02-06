'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, Sparkles, Download, Image, Layers, DollarSign, Clock, Ruler, ChevronRight, RotateCcw, Package, Eye } from 'lucide-react';
import { useAnalytics } from '@/lib/analytics/useAnalytics';
import { useLanguage } from '@/lib/i18n/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';
import { refreshEntitlements } from '@/lib/entitlements/client';
import type {
  ProductType,
  ProcessingStage,
  GenerateOptions,
  GenerateResponse,
  ProductSuggestion,
  ProductionInsights,
} from '../types';
import { PRODUCT_TYPES, DEFAULT_OPTIONS } from '../types';

type PreviewTab = 'engrave' | 'cut' | 'combined' | 'mockup';

const STAGE_LABELS: Record<ProcessingStage, string> = {
  idle: '',
  uploading: 'Uploading image...',
  preprocessing: 'Preprocessing image...',
  'ai-generation': 'AI generating engraving...',
  vectorization: 'Converting to vectors...',
  'mockup-rendering': 'Rendering mockup...',
  complete: 'Complete!',
  error: 'Error occurred',
};

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_DIMENSION = 1536; // Resize to cap payload size for the API

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

export function PhotoProductAITool() {
  const analytics = useAnalytics('photo-product-ai');
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  // Generation state
  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [selectedProduct, setSelectedProduct] = useState<ProductType>('engraved-frame');
  const [options, setOptions] = useState<GenerateOptions>({ ...DEFAULT_OPTIONS });
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Preview state
  const [previewTab, setPreviewTab] = useState<PreviewTab>('engrave');

  const handleFile = useCallback((file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Please upload a JPG, PNG, or WEBP image.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 15MB.');
      return;
    }
    setError(null);
    setUploadedFileName(file.name);
    setResult(null);
    setStage('idle');

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setUploadedImage(dataUrl);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleGenerate = async () => {
    if (!uploadedImage) return;

    setError(null);
    setResult(null);
    analytics.trackAIGeneration();

    try {
      setStage('preprocessing');
      const base64 = await resizeImageToBase64(uploadedImage);
      await delay(200);
      setStage('ai-generation');

      const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      const accessToken = typeof window !== 'undefined' ? window.localStorage.getItem('accessToken') : null;
      if (accessToken) authHeaders['Authorization'] = `Bearer ${accessToken}`;

      const response = await fetch('/api/ai/photo-product', {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({
          imageBase64: base64,
          productType: selectedProduct,
          options,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || `Generation failed (${response.status})`);
      }

      setStage('vectorization');
      await delay(300);

      const data: GenerateResponse = await response.json();

      setStage('mockup-rendering');
      await delay(300);

      setResult(data);
      setStage('complete');
      setPreviewTab('engrave');

      refreshEntitlements();
    } catch (err: any) {
      console.error('Photo product generation failed:', err);
      setError(err.message || 'Generation failed. Please try again.');
      setStage('error');
    }
  };

  const handleReset = () => {
    setUploadedImage(null);
    setUploadedFileName('');
    setResult(null);
    setStage('idle');
    setError(null);
    setOptions({ ...DEFAULT_OPTIONS });
    setSelectedProduct('engraved-frame');
  };

  const svgForExport = (svg: string): string => {
    return svg.replace(
      /viewBox="([^"]+)"\s+data-width-mm="([^"]+)"\s+data-height-mm="([^"]+)"/,
      'width="$2mm" height="$3mm" viewBox="$1"'
    );
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

      if (result.engravePreviewPng) {
        const pngData = atob(result.engravePreviewPng);
        const pngArray = new Uint8Array(pngData.length);
        for (let i = 0; i < pngData.length; i++) pngArray[i] = pngData.charCodeAt(i);
        zip.file('engrave-preview.png', pngArray);
      }

      if (result.mockupPng) {
        const mockData = atob(result.mockupPng);
        const mockArray = new Uint8Array(mockData.length);
        for (let i = 0; i < mockData.length; i++) mockArray[i] = mockData.charCodeAt(i);
        zip.file('mockup.png', mockArray);
      }

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
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isProcessing = stage !== 'idle' && stage !== 'complete' && stage !== 'error';

  return (
    <div className="flex h-full flex-col gap-4 lg:flex-row lg:gap-6">
      {/* Left Panel — Controls */}
      <div className="w-full shrink-0 space-y-5 overflow-y-auto lg:w-80">
        {/* Title */}
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Photo → Laser Product</h2>
          <p className="mt-1 text-sm text-slate-400">
            Upload a photo and generate laser-ready engraving files, cut outlines, mockups, and pricing.
          </p>
        </div>

        {/* Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            isDragging
              ? 'border-sky-400 bg-sky-500/10'
              : uploadedImage
                ? 'border-emerald-600 bg-emerald-900/10'
                : 'border-slate-700 bg-slate-900/40 hover:border-slate-600'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleFileInput}
            className="hidden"
          />
          {uploadedImage ? (
            <div className="space-y-2">
              <img
                src={uploadedImage}
                alt="Uploaded preview"
                className="mx-auto max-h-32 rounded-lg object-contain"
              />
              <p className="text-xs text-emerald-400 font-medium">{uploadedFileName}</p>
              <p className="text-xs text-slate-500">Click or drop to replace</p>
            </div>
          ) : (
            <>
              <Upload className="mb-2 h-8 w-8 text-slate-500" />
              <p className="text-sm font-medium text-slate-300">Drop photo here or click to upload</p>
              <p className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP — max 15MB</p>
            </>
          )}
        </div>

        {/* Product Type Selection */}
        {uploadedImage && (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Product Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(PRODUCT_TYPES) as [ProductType, typeof PRODUCT_TYPES[ProductType]][]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setSelectedProduct(key)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                    selectedProduct === key
                      ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                      : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <span className="mr-1">{val.icon}</span>
                  <span className="font-medium">{val.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Options */}
        {uploadedImage && (
          <div className="space-y-3 border-t border-slate-700 pt-4">
            <h3 className="text-sm font-semibold text-slate-200">Processing Options</h3>

            <SliderOption
              label="Kerf Offset"
              value={options.kerfMm}
              min={0}
              max={0.5}
              step={0.01}
              suffix="mm"
              onChange={(v) => setOptions((o) => ({ ...o, kerfMm: v }))}
            />
            <SliderOption
              label="Contrast"
              value={options.contrast}
              min={0}
              max={100}
              step={1}
              suffix="%"
              onChange={(v) => setOptions((o) => ({ ...o, contrast: v }))}
            />
            <SliderOption
              label="Edge Strength"
              value={options.edgeStrength}
              min={0}
              max={100}
              step={1}
              suffix="%"
              onChange={(v) => setOptions((o) => ({ ...o, edgeStrength: v }))}
            />
            <SliderOption
              label="Smoothing"
              value={options.smoothing}
              min={0}
              max={100}
              step={1}
              suffix="%"
              onChange={(v) => setOptions((o) => ({ ...o, smoothing: v }))}
            />
            <SliderOption
              label="Frame Padding"
              value={options.framePaddingMm}
              min={0}
              max={20}
              step={1}
              suffix="mm"
              onChange={(v) => setOptions((o) => ({ ...o, framePaddingMm: v }))}
            />

            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={options.includeFrame}
                onChange={(e) => setOptions((o) => ({ ...o, includeFrame: e.target.checked }))}
                className="rounded border-slate-600"
              />
              Include cut frame
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={options.invertEngraving}
                onChange={(e) => setOptions((o) => ({ ...o, invertEngraving: e.target.checked }))}
                className="rounded border-slate-600"
              />
              Invert engraving
            </label>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Generate Button */}
        {uploadedImage && (
          <div className="space-y-2">
            <button
              onClick={handleGenerate}
              disabled={isProcessing}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {STAGE_LABELS[stage]}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {result ? 'Regenerate Product' : 'Generate Product'}
                </>
              )}
            </button>

            {(result || uploadedImage) && (
              <button
                onClick={handleReset}
                disabled={isProcessing}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Start Over
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right Panel — Preview & Results */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* AI Suggestions */}
        {result?.productSuggestions && result.productSuggestions.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-200">AI Suggested Products</h3>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {result.productSuggestions.map((s) => (
                <button
                  key={s.type}
                  onClick={() => setSelectedProduct(s.type as ProductType)}
                  className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
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
          <div className="flex gap-1 border-b border-slate-700">
            {([
              { key: 'engrave' as const, label: 'Engrave', icon: Image },
              { key: 'cut' as const, label: 'Cut', icon: Layers },
              { key: 'combined' as const, label: 'Combined', icon: Eye },
              { key: 'mockup' as const, label: 'Mockup', icon: Package },
            ]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setPreviewTab(key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                  previewTab === key
                    ? 'border-b-2 border-sky-500 text-sky-400'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Preview Canvas */}
        <div className="flex flex-1 items-center justify-center overflow-auto rounded-b-xl bg-slate-900/50 p-6" style={{ minHeight: 420 }}>
          {!uploadedImage && !isProcessing && (
            <div className="text-center">
              <Image className="mx-auto mb-3 h-12 w-12 text-slate-600" />
              <p className="text-sm text-slate-500">Upload a photo to get started</p>
              <p className="mt-1 text-xs text-slate-600">
                AI will generate laser-ready engraving files, cut outlines, and production estimates
              </p>
            </div>
          )}

          {uploadedImage && !result && !isProcessing && (
            <div className="text-center">
              <img
                src={uploadedImage}
                alt="Preview"
                className="mx-auto max-h-[500px] max-w-full rounded-lg shadow-lg"
              />
              <p className="mt-3 text-sm text-slate-400">
                Click <strong>Generate Product</strong> to create laser files
              </p>
            </div>
          )}

          {isProcessing && (
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-sky-500" />
              <p className="text-sm font-medium text-slate-300">{STAGE_LABELS[stage]}</p>
              <div className="mx-auto mt-4 w-64">
                <ProgressBar stage={stage} />
              </div>
            </div>
          )}

          {result && previewTab === 'engrave' && (
            <div className="flex w-full flex-col items-center gap-4">
              {result.engravePreviewPng ? (
                <img
                  src={`data:image/png;base64,${result.engravePreviewPng}`}
                  alt="Engrave preview"
                  className="w-full max-w-2xl rounded-lg shadow-lg object-contain"
                  style={options.invertEngraving ? { filter: 'invert(1)' } : undefined}
                />
              ) : (
                <div
                  className="w-full max-w-2xl overflow-auto rounded-lg border border-slate-700 bg-white p-2 [&>svg]:h-auto [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: result.engraveSvg }}
                />
              )}
              <button
                onClick={() => handleDownloadSvg(result.engraveSvg, 'engrave.svg')}
                className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-600"
              >
                <Download className="h-4 w-4" />
                Download Engrave SVG
              </button>
            </div>
          )}

          {result && previewTab === 'cut' && (
            <div className="flex w-full flex-col items-center gap-4">
              <div
                className="w-full max-w-2xl overflow-auto rounded-lg border border-slate-700 bg-white p-4 [&>svg]:h-auto [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: result.cutSvg }}
              />
              <button
                onClick={() => handleDownloadSvg(result.cutSvg, 'cut.svg')}
                className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-600"
              >
                <Download className="h-4 w-4" />
                Download Cut SVG
              </button>
            </div>
          )}

          {result && previewTab === 'combined' && (
            <div className="flex w-full flex-col items-center gap-4">
              <div
                className="w-full max-w-2xl overflow-auto rounded-lg border border-slate-700 bg-white p-2 [&>svg]:h-auto [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: result.combinedSvg }}
              />
              <button
                onClick={() => handleDownloadSvg(result.combinedSvg, 'combined.svg')}
                className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-600"
              >
                <Download className="h-4 w-4" />
                Download Combined SVG
              </button>
            </div>
          )}

          {result && previewTab === 'mockup' && (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="rounded-xl bg-gradient-to-br from-amber-900/40 via-amber-800/30 to-amber-900/40 p-8 shadow-2xl">
                  <div className="rounded-lg border-4 border-amber-700/50 bg-amber-950/30 p-2 shadow-inner">
                    <img
                      src={`data:image/png;base64,${result.mockupPng}`}
                      alt="Product mockup"
                      className="w-full max-w-lg rounded object-contain"
                      style={options.invertEngraving ? { filter: 'invert(1)' } : undefined}
                    />
                  </div>
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-800 px-3 py-1 text-[10px] font-medium text-slate-400 shadow">
                  Wood Frame Mockup
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Production Insights + Export */}
        {result && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {/* Production Insights */}
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                Production Insights
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <InsightItem
                  icon={<Ruler className="h-3.5 w-3.5 text-sky-400" />}
                  label="Material Size"
                  value={`${result.productionInsights.materialWidthMm} x ${result.productionInsights.materialHeightMm}mm`}
                />
                <InsightItem
                  icon={<Clock className="h-3.5 w-3.5 text-amber-400" />}
                  label="Est. Time"
                  value={`~${result.productionInsights.estimatedTimeMinutes} min`}
                />
                <InsightItem
                  icon={<DollarSign className="h-3.5 w-3.5 text-emerald-400" />}
                  label="Material Cost"
                  value={`$${result.productionInsights.materialCostEstimate.toFixed(2)}`}
                />
                <InsightItem
                  icon={<DollarSign className="h-3.5 w-3.5 text-violet-400" />}
                  label="Suggested Price"
                  value={`$${result.productionInsights.recommendedPrice.toFixed(2)}`}
                />
                <InsightItem
                  icon={<Layers className="h-3.5 w-3.5 text-orange-400" />}
                  label="Cut Path"
                  value={`${result.productionInsights.cutPathLengthMm}mm`}
                />
                <InsightItem
                  icon={<ChevronRight className="h-3.5 w-3.5 text-pink-400" />}
                  label="Profit Margin"
                  value={`${result.productionInsights.profitMargin}%`}
                />
              </div>
            </div>

            {/* Export Panel */}
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Package className="h-4 w-4 text-sky-400" />
                Export Product Pack
              </h3>
              <p className="mb-4 text-xs text-slate-400">
                Download a complete ZIP with engrave SVG, cut SVG, combined SVG, mockup PNG, production summary, and product description.
              </p>
              <button
                onClick={handleExportZip}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                <Download className="h-4 w-4" />
                Download Product Pack (.zip)
              </button>
              <div className="mt-3 space-y-1">
                <ExportFileRow name="engrave.svg" desc="Engraving layer" />
                <ExportFileRow name="cut.svg" desc="Cut outline" />
                <ExportFileRow name="combined.svg" desc="Engrave + Cut" />
                <ExportFileRow name="mockup.png" desc="Product mockup" />
                <ExportFileRow name="production-summary.json" desc="Cost & time data" />
                <ExportFileRow name="product-description.txt" desc="Auto-generated text" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SliderOption({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-300">{label}</label>
        <span className="text-xs text-slate-500">
          {step < 1 ? value.toFixed(2) : value}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
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
    <div className="flex items-center justify-between text-xs">
      <span className="font-mono text-slate-300">{name}</span>
      <span className="text-slate-500">{desc}</span>
    </div>
  );
}

function ProgressBar({ stage }: { stage: ProcessingStage }) {
  const stages: ProcessingStage[] = ['preprocessing', 'ai-generation', 'vectorization', 'mockup-rendering', 'complete'];
  const idx = stages.indexOf(stage);
  const pct = idx < 0 ? 0 : Math.round(((idx + 1) / stages.length) * 100);

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
      <div
        className="h-full rounded-full bg-sky-500 transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
