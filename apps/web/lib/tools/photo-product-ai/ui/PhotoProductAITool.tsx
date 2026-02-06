'use client';

import { useCallback, useRef, useState } from 'react';
import {
  Upload, Sparkles, Download, Image, Layers, DollarSign, Clock, Ruler,
  RotateCcw, Package, Eye, AlertTriangle, Shield, Palette, Box, Zap,
  ChevronDown, ChevronUp, LayoutGrid, Activity, CheckCircle, XCircle,
  Gauge, Scissors, FileCheck, Recycle, Lightbulb, Target,
} from 'lucide-react';
import { useAnalytics } from '@/lib/analytics/useAnalytics';
import { useLanguage } from '@/lib/i18n/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';
import { refreshEntitlements } from '@/lib/entitlements/client';
import type {
  ProductType, ProcessingStage, GenerateOptions, GenerateResponse,
  MaterialId, StyleId, BatchItem,
} from '../types';
import {
  PRODUCT_TYPES, DEFAULT_OPTIONS, MATERIAL_PROFILES, STYLE_OPTIONS, MOCKUP_SCENES,
} from '../types';

type PreviewTab =
  | 'engrave' | 'cut' | 'combined' | 'optimized-cut'
  | 'simulation' | 'structural' | 'multilayer' | 'mockups';

const STAGE_LABELS: Record<ProcessingStage, string> = {
  idle: '',
  uploading: 'Uploading...',
  enhancing: 'Enhancing photo...',
  'style-transform': 'Applying style...',
  'ai-generation': 'AI generating engraving...',
  simulation: 'Running laser simulation...',
  'structural-analysis': 'Analyzing structural integrity...',
  'cut-optimization': 'Optimizing cut paths...',
  'file-validation': 'Validating laser files...',
  multilayer: 'Generating layers...',
  'risk-analysis': 'Analyzing risks...',
  'waste-analysis': 'Optimizing material usage...',
  variants: 'Creating variants...',
  mockups: 'Rendering mockups...',
  'design-coach': 'AI design coaching...',
  complete: 'Complete!',
  error: 'Error occurred',
};

const STAGE_ORDER: ProcessingStage[] = [
  'enhancing', 'style-transform', 'ai-generation', 'simulation',
  'structural-analysis', 'cut-optimization', 'file-validation',
  'multilayer', 'risk-analysis', 'waste-analysis', 'variants',
  'mockups', 'design-coach', 'complete',
];

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

  // Core state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [selectedProduct, setSelectedProduct] = useState<ProductType>('engraved-frame');
  const [options, setOptions] = useState<GenerateOptions>({ ...DEFAULT_OPTIONS });
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [previewTab, setPreviewTab] = useState<PreviewTab>('engrave');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showLaserParams, setShowLaserParams] = useState(false);
  const [selectedMockup, setSelectedMockup] = useState(0);
  const [selectedLayer, setSelectedLayer] = useState(0);
  const [bottomPanel, setBottomPanel] = useState<'intelligence' | 'coach' | 'export'>('intelligence');

  // Batch mode state
  const [batchMode, setBatchMode] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [selectedBatchItem, setSelectedBatchItem] = useState(0);
  const batchInputRef = useRef<HTMLInputElement>(null);

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

  // ── Generate (V2 pipeline) ──
  const handleGenerate = async () => {
    if (!uploadedImage) return;
    setError(null); setResult(null); analytics.trackAIGeneration();
    try {
      setStage('enhancing');
      const base64 = await resizeImageToBase64(uploadedImage);
      setStage('style-transform'); await delay(150);
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

      // Progress through V2 stages
      setStage('simulation'); await delay(120);
      setStage('structural-analysis'); await delay(100);
      setStage('cut-optimization'); await delay(100);
      setStage('file-validation'); await delay(80);
      setStage('risk-analysis'); await delay(80);
      setStage('waste-analysis'); await delay(80);
      const data: GenerateResponse = await response.json();
      setStage('variants'); await delay(80);
      setStage('mockups'); await delay(80);
      setStage('design-coach'); await delay(80);
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
    setBatchItems([]); setBatchMode(false); setBatchProcessing(false);
  };

  // ── Batch handlers ──
  const handleBatchFiles = useCallback((files: FileList) => {
    const validFiles = Array.from(files).filter(
      (f) => ACCEPTED_TYPES.includes(f.type) && f.size <= MAX_FILE_SIZE,
    ).slice(0, 10);
    if (validFiles.length === 0) { setError('No valid images selected.'); return; }
    setError(null);

    const items: BatchItem[] = [];
    let loaded = 0;
    validFiles.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        items.push({
          id: `batch-${Date.now()}-${i}`,
          fileName: file.name,
          imageBase64: (e.target?.result as string).split(',')[1] || '',
          status: 'queued',
          progress: 0,
          result: null,
          error: null,
        });
        loaded++;
        if (loaded === validFiles.length) {
          setBatchItems(items);
          setBatchMode(true);
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleBatchGenerate = async () => {
    if (batchItems.length === 0) return;
    setBatchProcessing(true); setError(null);
    analytics.trackAIGeneration();

    // Mark all as processing
    setBatchItems((prev) => prev.map((it) => ({ ...it, status: 'processing' as const, progress: 10 })));

    try {
      const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      const accessToken = typeof window !== 'undefined' ? window.localStorage.getItem('accessToken') : null;
      if (accessToken) authHeaders['Authorization'] = `Bearer ${accessToken}`;

      // Resize all images first
      const resizedImages = await Promise.all(
        batchItems.map(async (it) => {
          const dataUrl = `data:image/jpeg;base64,${it.imageBase64}`;
          const resized = await resizeImageToBase64(dataUrl);
          return { fileName: it.fileName, imageBase64: resized };
        }),
      );

      setBatchItems((prev) => prev.map((it) => ({ ...it, progress: 30 })));

      const response = await fetch('/api/ai/photo-product/batch', {
        method: 'POST', headers: authHeaders, credentials: 'include',
        body: JSON.stringify({
          images: resizedImages,
          productType: selectedProduct,
          options,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || `Batch failed (${response.status})`);
      }

      const data = await response.json();
      setBatchItems(data.items.map((it: any) => ({
        ...it,
        progress: 100,
        status: it.result ? 'complete' : 'error',
      })));
      refreshEntitlements();
    } catch (err: any) {
      console.error('Batch generation failed:', err);
      setError(err.message || 'Batch generation failed.');
      setBatchItems((prev) => prev.map((it) => ({
        ...it, status: 'error' as const, progress: 100, error: err.message,
      })));
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleBatchExportAll = async () => {
    const completedItems = batchItems.filter((it) => it.status === 'complete' && it.result);
    if (completedItems.length === 0) return;
    analytics.trackExport();

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      completedItems.forEach((it, i) => {
        const r = it.result!;
        const folder = zip.folder(`${i + 1}-${it.fileName.replace(/\.[^.]+$/, '')}`)!;
        folder.file('engrave.svg', svgForExport(r.engraveSvg));
        folder.file('cut.svg', svgForExport(r.cutSvg));
        folder.file('combined.svg', svgForExport(r.combinedSvg));
        if (r.optimizedCutSvg) folder.file('optimized-cut.svg', svgForExport(r.optimizedCutSvg));
        if (r.engravePreviewPng) folder.file('preview.png', b64toUint8(r.engravePreviewPng));
        folder.file('production-report.json', JSON.stringify(r.productionInsights, null, 2));
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch-${selectedProduct}-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Batch export failed:', err);
      setError('Batch export failed.');
    }
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

      // Core SVGs
      zip.file('engrave.svg', svgForExport(result.engraveSvg));
      zip.file('cut.svg', svgForExport(result.cutSvg));
      zip.file('combined.svg', svgForExport(result.combinedSvg));
      if (result.optimizedCutSvg) zip.file('optimized-cut.svg', svgForExport(result.optimizedCutSvg));
      if (result.engravePreviewPng) zip.file('engrave-preview.png', b64toUint8(result.engravePreviewPng));
      if (result.laserSimulation?.simulationPng) zip.file('simulation-preview.png', b64toUint8(result.laserSimulation.simulationPng));

      // Multilayer
      if (result.multilayer) {
        const mlFolder = zip.folder('multilayer')!;
        result.multilayer.layers.forEach((l) =>
          mlFolder.file(`layer-${l.index + 1}.svg`, svgForExport(l.svg)),
        );
      }

      // Mockups
      if (result.mockups?.length) {
        const mkFolder = zip.folder('mockups')!;
        result.mockups.forEach((m) => mkFolder.file(`${m.scene}.png`, b64toUint8(m.png)));
      }

      // Variants
      if (result.variants?.length) {
        const vFolder = zip.folder('variants')!;
        result.variants.forEach((v) => {
          vFolder.file(`${v.productType}-engrave.svg`, svgForExport(v.engraveSvg));
          vFolder.file(`${v.productType}-cut.svg`, svgForExport(v.cutSvg));
        });
      }

      // V2 reports
      const reports: Record<string, any> = {
        'production-report.json': {
          insights: result.productionInsights,
          sizeRecommendation: result.sizeRecommendation,
          riskWarnings: result.riskWarnings,
          laserSimulation: result.laserSimulation ? {
            kerfWidthAtSpeed: result.laserSimulation.kerfWidthAtSpeed,
            qualityScore: result.laserSimulation.qualityScore,
            depthEstimateMm: result.laserSimulation.depthEstimateMm,
            smokeStainIntensity: result.laserSimulation.smokeStainIntensity,
          } : null,
          structuralAnalysis: result.structuralAnalysis ? {
            strengthScore: result.structuralAnalysis.strengthScore,
            fragileBridges: result.structuralAnalysis.fragileBridges,
            thinParts: result.structuralAnalysis.thinParts,
          } : null,
          cutPathOptimization: result.cutPathOptimization ? {
            savedTravelMm: result.cutPathOptimization.savedTravelMm,
            savedTimeSec: result.cutPathOptimization.savedTimeSec,
          } : null,
          wasteAnalysis: result.wasteAnalysis,
          designCoachTips: result.designCoachTips,
        },
        'validation-report.json': result.fileValidation,
      };
      if (result.cutPathOptimization) {
        reports['machine-order.json'] = result.cutPathOptimization.machineOrder;
      }
      Object.entries(reports).forEach(([name, data]) => {
        if (data) zip.file(name, JSON.stringify(data, null, 2));
      });

      zip.file('product-description.txt', result.description);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `photo-product-v2-${selectedProduct}-${Date.now()}.zip`;
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
      {/* ═══════════ LEFT PANEL — Controls ═══════════ */}
      <div className="w-full shrink-0 space-y-3 overflow-y-auto lg:w-[360px]">
        {/* Header */}
        <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-800/80 to-slate-900 p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-violet-500">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Photo → Laser Product</h2>
              <p className="text-[10px] text-slate-500">V2 — Production Intelligence Engine</p>
            </div>
          </div>
        </div>

        {/* Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition-all ${
            isDragging
              ? 'border-sky-400 bg-sky-500/10 scale-[1.02]'
              : uploadedImage
                ? 'border-emerald-600/50 bg-emerald-900/10'
                : 'border-slate-700 bg-slate-900/40 hover:border-slate-500'
          }`}
        >
          <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleFileInput} className="hidden" />
          {uploadedImage ? (
            <div className="space-y-2">
              <img src={uploadedImage} alt="Preview" className="mx-auto max-h-24 rounded-lg object-contain shadow-lg" />
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

        {/* Batch Mode Toggle + Upload */}
        <div className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2">
          <span className="text-[11px] text-slate-400">Batch Mode (Etsy sellers)</span>
          <div onClick={() => { setBatchMode(!batchMode); if (batchMode) setBatchItems([]); }}
            className={`relative h-5 w-9 cursor-pointer rounded-full transition-colors ${batchMode ? 'bg-fuchsia-500' : 'bg-slate-700'}`}>
            <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${batchMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
        </div>

        {batchMode && (
          <div className="space-y-2">
            <input ref={batchInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" multiple
              onChange={(e) => { if (e.target.files) handleBatchFiles(e.target.files); }}
              className="hidden" />
            <button
              onClick={() => batchInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-fuchsia-700/50 bg-fuchsia-900/10 px-4 py-3 text-xs text-fuchsia-300 hover:border-fuchsia-600/50"
            >
              <Upload className="h-4 w-4" />
              Select Multiple Photos (max 10)
            </button>
            {batchItems.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-slate-500">{batchItems.length} images queued</div>
                {batchItems.map((it, i) => (
                  <div key={it.id} className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-[10px] ${
                    it.status === 'complete' ? 'bg-emerald-900/20 text-emerald-300'
                      : it.status === 'error' ? 'bg-red-900/20 text-red-300'
                        : it.status === 'processing' ? 'bg-sky-900/20 text-sky-300'
                          : 'bg-slate-800/50 text-slate-400'
                  }`}>
                    <span className="truncate max-w-[180px]">{it.fileName}</span>
                    <span className="shrink-0 ml-2">
                      {it.status === 'complete' ? <CheckCircle className="h-3 w-3 text-emerald-400" />
                        : it.status === 'error' ? <XCircle className="h-3 w-3 text-red-400" />
                          : it.status === 'processing' ? <Activity className="h-3 w-3 animate-pulse text-sky-400" />
                            : <div className="h-3 w-3 rounded-full border border-slate-600" />}
                    </span>
                  </div>
                ))}
                <button
                  onClick={handleBatchGenerate}
                  disabled={batchProcessing}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-fuchsia-500 to-violet-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg disabled:opacity-50"
                >
                  {batchProcessing ? (
                    <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Processing batch...</>
                  ) : (
                    <><Sparkles className="h-3.5 w-3.5" /> Generate All ({batchItems.length})</>
                  )}
                </button>
                {batchItems.some((it) => it.status === 'complete') && (
                  <button
                    onClick={handleBatchExportAll}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700"
                  >
                    <Download className="h-3.5 w-3.5" /> Export All as ZIP
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {(uploadedImage || batchMode) && (
          <>
            {/* ── Material Selector ── */}
            <Section title="Material" icon={<Box className="h-3.5 w-3.5 text-amber-400" />}>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.entries(MATERIAL_PROFILES) as [MaterialId, typeof MATERIAL_PROFILES[MaterialId]][]).map(
                  ([id, m]) => (
                    <button
                      key={id}
                      onClick={() => setOptions((o) => ({
                        ...o, material: id, kerfMm: m.kerfCoefficient,
                        laserSpeedMmS: m.recommendedSpeedMmS, laserPowerPct: m.recommendedPowerPct,
                      }))}
                      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] transition-all ${
                        options.material === id
                          ? 'border-amber-500/70 bg-amber-500/10 text-amber-300 shadow-sm shadow-amber-500/10'
                          : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span>{m.icon}</span>
                      <span className="truncate font-medium">{m.label}</span>
                    </button>
                  ),
                )}
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1 text-[9px] text-slate-500">
                <span>Kerf: {mat.kerfCoefficient}mm</span>
                <span>Thick: {mat.thicknessMm}mm</span>
                <span>${mat.costPerM2}/m²</span>
                <span>Burn: {mat.burnCoefficient}</span>
              </div>
            </Section>

            {/* ── Style Selector ── */}
            <Section title="Engraving Style" icon={<Palette className="h-3.5 w-3.5 text-violet-400" />}>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.entries(STYLE_OPTIONS) as [StyleId, typeof STYLE_OPTIONS[StyleId]][]).map(([id, s]) => (
                  <button
                    key={id}
                    onClick={() => setOptions((o) => ({ ...o, style: id }))}
                    className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] transition-all ${
                      options.style === id
                        ? 'border-violet-500/70 bg-violet-500/10 text-violet-300 shadow-sm shadow-violet-500/10'
                        : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600'
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
                      className={`rounded-lg border px-2 py-1.5 text-left text-[11px] transition-all ${
                        selectedProduct === key
                          ? 'border-sky-500/70 bg-sky-500/10 text-sky-300 shadow-sm shadow-sky-500/10'
                          : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="mr-1">{val.icon}</span>
                      <span className="font-medium">{val.label}</span>
                      <span className="ml-1 text-[9px] text-slate-600">{val.sizeMm[0]}x{val.sizeMm[1]}</span>
                    </button>
                  ),
                )}
              </div>
            </Section>

            {/* ── AI Feature Toggles ── */}
            <Section title="AI Features" icon={<Sparkles className="h-3.5 w-3.5 text-yellow-400" />}>
              <div className="space-y-1.5">
                <Toggle label="Enhance Photo" checked={options.enhancePhoto} onChange={(v) => setOptions((o) => ({ ...o, enhancePhoto: v }))} />
                <Toggle label="Ultra Real Laser Simulation" checked={options.ultraRealSimulation} onChange={(v) => setOptions((o) => ({ ...o, ultraRealSimulation: v }))} accent="orange" />
                <Toggle label="Structural Analysis" checked={options.structuralAnalysis} onChange={(v) => setOptions((o) => ({ ...o, structuralAnalysis: v }))} accent="red" />
                <Toggle label="Cut Path Optimization" checked={options.cutPathOptimization} onChange={(v) => setOptions((o) => ({ ...o, cutPathOptimization: v }))} accent="green" />
                <Toggle label="File Validation" checked={options.fileValidation} onChange={(v) => setOptions((o) => ({ ...o, fileValidation: v }))} />
                <Toggle label="Material Waste Analysis" checked={options.wasteOptimization} onChange={(v) => setOptions((o) => ({ ...o, wasteOptimization: v }))} />
                <Toggle label="Design AI Coach" checked={options.designCoach} onChange={(v) => setOptions((o) => ({ ...o, designCoach: v }))} accent="violet" />
                <Toggle label="Generate Multilayer" checked={options.generateMultilayer} onChange={(v) => setOptions((o) => ({ ...o, generateMultilayer: v }))} />
                <Toggle label="Auto Product Variants" checked={options.generateVariants} onChange={(v) => setOptions((o) => ({ ...o, generateVariants: v }))} />
                <Toggle label="Invert Engraving" checked={options.invertEngraving} onChange={(v) => setOptions((o) => ({ ...o, invertEngraving: v }))} />
                <Toggle label="Include Cut Frame" checked={options.includeFrame} onChange={(v) => setOptions((o) => ({ ...o, includeFrame: v }))} />
              </div>
            </Section>

            {/* ── Laser Parameters (V2) ── */}
            <button
              onClick={() => setShowLaserParams(!showLaserParams)}
              className="flex w-full items-center justify-between rounded-lg border border-orange-800/30 bg-orange-900/10 px-3 py-2 text-xs text-orange-300 hover:bg-orange-900/20"
            >
              <span className="flex items-center gap-1.5"><Zap className="h-3 w-3" /> Laser Parameters</span>
              {showLaserParams ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showLaserParams && (
              <div className="space-y-3 rounded-lg border border-orange-800/20 bg-slate-900/60 p-3">
                <SliderOption label="Speed" value={options.laserSpeedMmS} min={50} max={800} step={10} suffix=" mm/s" onChange={(v) => setOptions((o) => ({ ...o, laserSpeedMmS: v }))} />
                <SliderOption label="Power" value={options.laserPowerPct} min={5} max={100} step={1} suffix="%" onChange={(v) => setOptions((o) => ({ ...o, laserPowerPct: v }))} />
                <SliderOption label="Passes" value={options.laserPasses} min={1} max={5} step={1} suffix="x" onChange={(v) => setOptions((o) => ({ ...o, laserPasses: v }))} />
                <div className="rounded bg-slate-800/50 p-2 text-[10px] text-slate-500">
                  Recommended for {mat.label}: {mat.recommendedSpeedMmS}mm/s @ {mat.recommendedPowerPct}%
                </div>
              </div>
            )}

            {/* ── Advanced Options ── */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:bg-slate-800/50"
            >
              <span>Advanced Options</span>
              {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showAdvanced && (
              <div className="space-y-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                <SliderOption label="Kerf Offset" value={options.kerfMm} min={0} max={0.5} step={0.01} suffix="mm" onChange={(v) => setOptions((o) => ({ ...o, kerfMm: v }))} />
                <SliderOption label="Contrast" value={options.contrast} min={0} max={100} step={1} suffix="%" onChange={(v) => setOptions((o) => ({ ...o, contrast: v }))} />
                <SliderOption label="Edge Strength" value={options.edgeStrength} min={0} max={100} step={1} suffix="%" onChange={(v) => setOptions((o) => ({ ...o, edgeStrength: v }))} />
                <SliderOption label="Smoothing" value={options.smoothing} min={0} max={100} step={1} suffix="%" onChange={(v) => setOptions((o) => ({ ...o, smoothing: v }))} />
                <SliderOption label="Frame Padding" value={options.framePaddingMm} min={0} max={20} step={1} suffix="mm" onChange={(v) => setOptions((o) => ({ ...o, framePaddingMm: v }))} />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-800/50 bg-red-900/20 p-3 text-xs text-red-300">
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Generate Button */}
            <div className="space-y-2">
              <button
                onClick={handleGenerate}
                disabled={isProcessing}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition-all hover:shadow-xl hover:shadow-violet-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {STAGE_LABELS[stage]}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {result ? 'Regenerate V2' : 'Generate Product V2'}
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

      {/* ═══════════ RIGHT PANEL — Preview & Results ═══════════ */}
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
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all ${
                    selectedProduct === s.type
                      ? 'border-sky-500/70 bg-sky-500/10 text-sky-300'
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
          <div className="flex gap-0.5 overflow-x-auto border-b border-slate-700/50">
            {([
              { key: 'engrave' as const, label: 'Engrave', icon: Image },
              { key: 'cut' as const, label: 'Cut', icon: Scissors },
              { key: 'combined' as const, label: 'Combined', icon: Eye },
              ...(result.optimizedCutSvg ? [{ key: 'optimized-cut' as const, label: 'Optimized Cut', icon: Target }] : []),
              { key: 'simulation' as const, label: 'Laser Sim', icon: Zap },
              ...(result.structuralAnalysis ? [{ key: 'structural' as const, label: 'Structural', icon: Shield }] : []),
              ...(result.multilayer ? [{ key: 'multilayer' as const, label: 'Multilayer', icon: Layers }] : []),
              { key: 'mockups' as const, label: 'Mockups', icon: Package },
            ]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setPreviewTab(key)}
                className={`flex shrink-0 items-center gap-1 px-3 py-2 text-xs font-medium transition-all ${
                  previewTab === key
                    ? 'border-b-2 border-sky-500 text-sky-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Preview Canvas */}
        <div className="flex flex-1 items-center justify-center overflow-auto rounded-b-xl bg-slate-900/30 p-4" style={{ minHeight: 360 }}>
          {/* Empty state */}
          {!uploadedImage && !isProcessing && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/50">
                <Image className="h-8 w-8 text-slate-600" />
              </div>
              <p className="text-sm font-medium text-slate-400">Upload a photo to get started</p>
              <p className="mt-1 text-xs text-slate-600">AI will generate laser-ready files with production intelligence</p>
            </div>
          )}

          {/* Uploaded but not generated */}
          {uploadedImage && !result && !isProcessing && (
            <div className="text-center">
              <img src={uploadedImage} alt="Preview" className="mx-auto max-h-[420px] max-w-full rounded-xl shadow-2xl" />
              <p className="mt-3 text-sm text-slate-400">
                Click <strong className="text-sky-400">Generate Product V2</strong> to create laser files
              </p>
            </div>
          )}

          {/* Processing */}
          {isProcessing && (
            <div className="w-full max-w-sm text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-sky-500" />
              <p className="text-sm font-semibold text-slate-200">{STAGE_LABELS[stage]}</p>
              <div className="mx-auto mt-4">
                <ProgressBar stage={stage} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-1">
                {STAGE_ORDER.map((s) => {
                  const idx = STAGE_ORDER.indexOf(stage);
                  const sIdx = STAGE_ORDER.indexOf(s);
                  const done = sIdx < idx;
                  const current = s === stage;
                  return (
                    <div key={s} className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] ${
                      done ? 'text-emerald-500' : current ? 'text-sky-400 font-medium' : 'text-slate-600'
                    }`}>
                      {done ? <CheckCircle className="h-2.5 w-2.5" /> : current ? <Activity className="h-2.5 w-2.5 animate-pulse" /> : <div className="h-2.5 w-2.5 rounded-full border border-slate-700" />}
                      {STAGE_LABELS[s]?.replace('...', '')}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Engrave Tab ── */}
          {result && previewTab === 'engrave' && (
            <PreviewPane>
              <img
                src={`data:image/jpeg;base64,${result.engravePreviewPng}`}
                alt="Engrave"
                className="w-full max-w-2xl rounded-lg shadow-2xl object-contain"
                style={options.invertEngraving ? { filter: 'invert(1)' } : undefined}
              />
              <DlBtn onClick={() => handleDownloadSvg(result.engraveSvg, 'engrave.svg')} label="Download Engrave SVG" />
            </PreviewPane>
          )}

          {/* ── Cut Tab ── */}
          {result && previewTab === 'cut' && (
            <PreviewPane>
              <div className="w-full max-w-2xl overflow-auto rounded-lg border border-slate-700 bg-white p-4 [&>svg]:h-auto [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: result.cutSvg }} />
              <DlBtn onClick={() => handleDownloadSvg(result.cutSvg, 'cut.svg')} label="Download Cut SVG" />
            </PreviewPane>
          )}

          {/* ── Combined Tab ── */}
          {result && previewTab === 'combined' && (
            <PreviewPane>
              <div className="w-full max-w-2xl overflow-auto rounded-lg border border-slate-700 bg-white p-2 [&>svg]:h-auto [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: result.combinedSvg }} />
              <DlBtn onClick={() => handleDownloadSvg(result.combinedSvg, 'combined.svg')} label="Download Combined SVG" />
            </PreviewPane>
          )}

          {/* ── Optimized Cut Tab (V2) ── */}
          {result && previewTab === 'optimized-cut' && result.optimizedCutSvg && (
            <PreviewPane>
              <div className="w-full max-w-2xl overflow-auto rounded-lg border border-slate-700 bg-white p-2 [&>svg]:h-auto [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: result.optimizedCutSvg }} />
              {result.cutPathOptimization && (
                <div className="mt-2 flex gap-3 text-[10px] text-slate-400">
                  <span className="text-emerald-400">Saved {result.cutPathOptimization.savedTravelMm}mm travel</span>
                  <span className="text-emerald-400">Saved {result.cutPathOptimization.savedTimeSec}s</span>
                  <span>{result.cutPathOptimization.insideFirstApplied ? '✓ Inside-first' : ''}</span>
                </div>
              )}
              <DlBtn onClick={() => handleDownloadSvg(result.optimizedCutSvg!, 'optimized-cut.svg')} label="Download Optimized Cut SVG" />
            </PreviewPane>
          )}

          {/* ── Laser Simulation Tab (V2) ── */}
          {result && previewTab === 'simulation' && (
            <PreviewPane>
              <div className="relative w-full max-w-2xl">
                <div className="rounded-xl p-4 shadow-2xl" style={{ backgroundColor: mat.color }}>
                  <img
                    src={`data:image/jpeg;base64,${result.laserSimulation?.simulationPng || result.engravePreviewPng}`}
                    alt="Laser simulation"
                    className="w-full rounded-lg object-contain mix-blend-multiply"
                    style={{ filter: `contrast(${mat.engravingContrastCurve}) sepia(0.3) saturate(0.7)`, opacity: 0.85 }}
                  />
                  {/* Smoke stain overlay */}
                  {result.laserSimulation && result.laserSimulation.smokeStainIntensity > 0.3 && (
                    <div className="pointer-events-none absolute inset-4 rounded-lg"
                      style={{ boxShadow: `inset 0 0 ${result.laserSimulation.smokeStainIntensity * 20}px rgba(80,50,20,${result.laserSimulation.smokeStainIntensity * 0.4})` }} />
                  )}
                  {/* Acrylic frost overlay */}
                  {result.laserSimulation && result.laserSimulation.acrylicFrostLevel > 0.3 && (
                    <div className="pointer-events-none absolute inset-4 rounded-lg"
                      style={{ background: `rgba(255,255,255,${result.laserSimulation.acrylicFrostLevel * 0.15})`, backdropFilter: `blur(${result.laserSimulation.acrylicFrostLevel}px)` }} />
                  )}
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-800 px-3 py-1 text-[10px] font-medium text-slate-400 shadow">
                  {mat.label} — {options.laserSpeedMmS}mm/s @ {options.laserPowerPct}% — Quality: {result.laserSimulation?.qualityScore ?? '—'}/100
                </div>
              </div>
              {/* Simulation metrics */}
              {result.laserSimulation && (
                <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  <SimMetric label="Kerf" value={`${result.laserSimulation.kerfWidthAtSpeed}mm`} color="sky" />
                  <SimMetric label="Depth" value={`${result.laserSimulation.depthEstimateMm}mm`} color="amber" />
                  <SimMetric label="Heat Zones" value={`${result.laserSimulation.heatAccumulationZones}`} color="red" />
                  <SimMetric label="Smoke" value={`${Math.round(result.laserSimulation.smokeStainIntensity * 100)}%`} color="orange" />
                  <SimMetric label="Frost" value={`${Math.round(result.laserSimulation.acrylicFrostLevel * 100)}%`} color="cyan" />
                  <SimMetric label="Quality" value={`${result.laserSimulation.qualityScore}/100`} color="emerald" />
                </div>
              )}
            </PreviewPane>
          )}

          {/* ── Structural Analysis Tab (V2) ── */}
          {result && previewTab === 'structural' && result.structuralAnalysis && (
            <PreviewPane>
              <div className="w-full max-w-2xl">
                {/* Strength score gauge */}
                <div className="mb-4 flex items-center justify-center gap-4">
                  <ScoreGauge score={result.structuralAnalysis.strengthScore} label="Strength" />
                </div>
                {/* Overlay */}
                <div className="overflow-auto rounded-lg border border-slate-700 bg-white p-2 [&>svg]:h-auto [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: result.structuralAnalysis.overlaySvg }} />
                {/* Metrics */}
                <div className="mt-3 grid grid-cols-4 gap-2">
                  <MetricCard label="Fragile Bridges" value={result.structuralAnalysis.fragileBridges} warn={result.structuralAnalysis.fragileBridges > 0} />
                  <MetricCard label="Thin Parts" value={result.structuralAnalysis.thinParts} warn={result.structuralAnalysis.thinParts > 0} />
                  <MetricCard label="Stress Points" value={result.structuralAnalysis.stressPoints} warn={result.structuralAnalysis.stressPoints > 2} />
                  <MetricCard label="Break Zones" value={result.structuralAnalysis.breakZones} warn={result.structuralAnalysis.breakZones > 0} />
                </div>
                {/* Warnings */}
                <div className="mt-3 space-y-1">
                  {result.structuralAnalysis.warnings.map((w, i) => (
                    <WarningRow key={i} severity={w.severity} message={w.message} />
                  ))}
                </div>
              </div>
            </PreviewPane>
          )}

          {/* ── Multilayer Tab ── */}
          {result && previewTab === 'multilayer' && result.multilayer && (
            <PreviewPane>
              <div className="flex gap-2 mb-2">
                {result.multilayer.layers.map((l, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedLayer(i)}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${
                      selectedLayer === i
                        ? 'border-sky-500/70 bg-sky-500/10 text-sky-300'
                        : 'border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className="inline-block h-2 w-2 rounded-full mr-1" style={{ backgroundColor: l.suggestedColor }} />
                    {l.label} ({l.depthPercent}%)
                    <span className="ml-1 text-[9px] text-slate-600">{l.recommendedThicknessMm}mm</span>
                  </button>
                ))}
              </div>
              <div className="w-full max-w-2xl overflow-auto rounded-lg border border-slate-700 bg-white p-2 [&>svg]:h-auto [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: result.multilayer.layers[selectedLayer]?.svg || '' }} />
              <DlBtn onClick={() => {
                const l = result.multilayer!.layers[selectedLayer];
                if (l) handleDownloadSvg(l.svg, `layer-${l.index + 1}.svg`);
              }} label="Download Layer SVG" />
            </PreviewPane>
          )}

          {/* ── Mockups Tab ── */}
          {result && previewTab === 'mockups' && result.mockups && result.mockups.length > 0 && (
            <PreviewPane>
              <div className="flex gap-2 mb-2 flex-wrap">
                {result.mockups.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedMockup(i)}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${
                      selectedMockup === i
                        ? 'border-sky-500/70 bg-sky-500/10 text-sky-300'
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
              </div>
            </PreviewPane>
          )}
        </div>

        {/* ═══════════ BOTTOM PANELS (V2) ═══════════ */}
        {result && (
          <div className="mt-4">
            {/* Panel tabs */}
            <div className="mb-3 flex gap-1">
              {([
                { key: 'intelligence' as const, label: 'Production Intelligence', icon: Activity },
                { key: 'coach' as const, label: 'AI Design Coach', icon: Lightbulb },
                { key: 'export' as const, label: 'Export Package', icon: Package },
              ]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setBottomPanel(key)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                    bottomPanel === key
                      ? 'bg-slate-800 text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="h-3 w-3" /> {label}
                </button>
              ))}
            </div>

            {/* ── Production Intelligence Panel ── */}
            {bottomPanel === 'intelligence' && (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {/* Time Estimate */}
                <IntelCard title="Production Time" icon={<Clock className="h-3.5 w-3.5 text-amber-400" />}>
                  <div className="text-2xl font-bold text-slate-100">~{result.productionInsights.estimatedTimeMinutes} min</div>
                  <div className="mt-1 text-[10px] text-slate-500">
                    Confidence: {result.productionInsights.confidenceScore}%
                  </div>
                  <div className="mt-2 space-y-1 text-[10px]">
                    <div className="flex justify-between"><span className="text-slate-500">Engrave</span><span className="text-slate-300">{result.productionInsights.engraveTimeSec}s</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Cut</span><span className="text-slate-300">{result.productionInsights.cutTimeSec}s</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Travel</span><span className="text-slate-300">{result.productionInsights.travelTimeSec}s</span></div>
                  </div>
                </IntelCard>

                {/* Risk Alerts */}
                <IntelCard title="Risk Alerts" icon={<AlertTriangle className="h-3.5 w-3.5 text-orange-400" />}>
                  <div className="space-y-1">
                    {result.riskWarnings.slice(0, 4).map((w, i) => (
                      <WarningRow key={i} severity={w.severity} message={w.message} compact />
                    ))}
                  </div>
                </IntelCard>

                {/* Structural Score */}
                {result.structuralAnalysis && (
                  <IntelCard title="Structural Score" icon={<Shield className="h-3.5 w-3.5 text-sky-400" />}>
                    <ScoreGauge score={result.structuralAnalysis.strengthScore} label="Strength" small />
                    <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
                      <span className="text-slate-500">Bridges: <span className={result.structuralAnalysis.fragileBridges > 0 ? 'text-orange-400' : 'text-emerald-400'}>{result.structuralAnalysis.fragileBridges}</span></span>
                      <span className="text-slate-500">Thin: <span className={result.structuralAnalysis.thinParts > 0 ? 'text-orange-400' : 'text-emerald-400'}>{result.structuralAnalysis.thinParts}</span></span>
                      <span className="text-slate-500">Stress: <span className={result.structuralAnalysis.stressPoints > 2 ? 'text-red-400' : 'text-emerald-400'}>{result.structuralAnalysis.stressPoints}</span></span>
                      <span className="text-slate-500">Break: <span className={result.structuralAnalysis.breakZones > 0 ? 'text-red-400' : 'text-emerald-400'}>{result.structuralAnalysis.breakZones}</span></span>
                    </div>
                  </IntelCard>
                )}

                {/* Material Efficiency */}
                {result.wasteAnalysis && (
                  <IntelCard title="Material Efficiency" icon={<Recycle className="h-3.5 w-3.5 text-emerald-400" />}>
                    <div className="text-2xl font-bold text-emerald-400">{result.wasteAnalysis.usagePercent}%</div>
                    <div className="mt-1 text-[10px] text-slate-500">usage of {result.wasteAnalysis.sheetSizeMm[0]}x{result.wasteAnalysis.sheetSizeMm[1]}mm sheet</div>
                    <div className="mt-2 space-y-1 text-[10px]">
                      <div className="flex justify-between"><span className="text-slate-500">Waste</span><span className="text-slate-300">{result.wasteAnalysis.wastePercent}%</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Waste Area</span><span className="text-slate-300">{result.wasteAnalysis.wasteAreaMm2}mm²</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Potential Saving</span><span className="text-emerald-400">${result.wasteAnalysis.costSavingEstimate}</span></div>
                    </div>
                  </IntelCard>
                )}

                {/* File Validation */}
                {result.fileValidation && (
                  <IntelCard title="File Validation" icon={<FileCheck className="h-3.5 w-3.5 text-sky-400" />}>
                    <div className="flex items-center gap-2">
                      {result.fileValidation.isValid
                        ? <CheckCircle className="h-5 w-5 text-emerald-400" />
                        : <XCircle className="h-5 w-5 text-red-400" />
                      }
                      <span className={`text-lg font-bold ${result.fileValidation.isValid ? 'text-emerald-400' : 'text-red-400'}`}>
                        {result.fileValidation.score}/100
                      </span>
                    </div>
                    <div className="mt-2 space-y-1">
                      {result.fileValidation.issues.slice(0, 3).map((iss, i) => (
                        <WarningRow key={i} severity={iss.severity} message={iss.message} compact />
                      ))}
                    </div>
                  </IntelCard>
                )}

                {/* Cut Optimization */}
                {result.cutPathOptimization && (
                  <IntelCard title="Cut Optimization" icon={<Target className="h-3.5 w-3.5 text-green-400" />}>
                    <div className="space-y-1 text-[10px]">
                      <div className="flex justify-between"><span className="text-slate-500">Travel Saved</span><span className="text-emerald-400">{result.cutPathOptimization.savedTravelMm}mm</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Time Saved</span><span className="text-emerald-400">{result.cutPathOptimization.savedTimeSec}s</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Inside-First</span><span className={result.cutPathOptimization.insideFirstApplied ? 'text-emerald-400' : 'text-slate-400'}>{result.cutPathOptimization.insideFirstApplied ? 'Applied' : 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Segments</span><span className="text-slate-300">{result.cutPathOptimization.machineOrder.length}</span></div>
                    </div>
                  </IntelCard>
                )}

                {/* Cost & Pricing */}
                <IntelCard title="Cost & Pricing" icon={<DollarSign className="h-3.5 w-3.5 text-emerald-400" />}>
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between"><span className="text-slate-500">Material Cost</span><span className="text-slate-300">${result.productionInsights.materialCostEstimate}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Recommended Price</span><span className="text-emerald-400 font-semibold">${result.productionInsights.recommendedPrice}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Profit Margin</span><span className="text-emerald-400">{result.productionInsights.profitMargin}%</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Size</span><span className="text-slate-300">{result.productionInsights.materialWidthMm}x{result.productionInsights.materialHeightMm}mm</span></div>
                  </div>
                </IntelCard>

                {/* Simulation Summary */}
                {result.laserSimulation && (
                  <IntelCard title="Simulation Summary" icon={<Gauge className="h-3.5 w-3.5 text-orange-400" />}>
                    <ScoreGauge score={result.laserSimulation.qualityScore} label="Quality" small />
                    <div className="mt-2 space-y-1 text-[10px]">
                      <div className="flex justify-between"><span className="text-slate-500">Kerf at Speed</span><span className="text-slate-300">{result.laserSimulation.kerfWidthAtSpeed}mm</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Depth</span><span className="text-slate-300">{result.laserSimulation.depthEstimateMm}mm</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Heat Zones</span><span className={result.laserSimulation.heatAccumulationZones > 5 ? 'text-red-400' : 'text-slate-300'}>{result.laserSimulation.heatAccumulationZones}</span></div>
                    </div>
                  </IntelCard>
                )}
              </div>
            )}

            {/* ── AI Design Coach Panel ── */}
            {bottomPanel === 'coach' && (
              <div className="space-y-3">
                {result.designCoachTips && result.designCoachTips.length > 0 ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    {result.designCoachTips.map((tip, i) => (
                      <div key={i} className={`rounded-xl border p-3 ${
                        tip.impact === 'high'
                          ? 'border-amber-700/40 bg-amber-900/10'
                          : tip.impact === 'medium'
                            ? 'border-sky-700/40 bg-sky-900/10'
                            : 'border-slate-700/40 bg-slate-800/30'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CategoryBadge category={tip.category} />
                            <span className="text-xs font-semibold text-slate-200">{tip.title}</span>
                          </div>
                          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                            tip.impact === 'high' ? 'bg-amber-900/40 text-amber-300'
                              : tip.impact === 'medium' ? 'bg-sky-900/40 text-sky-300'
                                : 'bg-slate-800 text-slate-400'
                          }`}>{tip.impact}</span>
                        </div>
                        <p className="mt-1.5 text-[11px] text-slate-400">{tip.suggestion}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-6 text-center">
                    <Lightbulb className="mx-auto mb-2 h-6 w-6 text-slate-600" />
                    <p className="text-xs text-slate-500">Enable Design AI Coach to get improvement suggestions</p>
                  </div>
                )}

                {/* Product Variants */}
                {result.variants && result.variants.length > 0 && (
                  <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
                      <LayoutGrid className="h-4 w-4 text-violet-400" /> Product Variants
                    </h3>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                      {result.variants.map((v) => (
                        <div key={v.productType} className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-2 text-center">
                          <img
                            src={`data:image/jpeg;base64,${v.previewPng}`}
                            alt={v.label}
                            className="mx-auto mb-1.5 h-14 w-14 rounded object-contain"
                            style={options.invertEngraving ? { filter: 'invert(1)' } : undefined}
                          />
                          <p className="text-[11px] font-medium text-slate-200">{v.icon} {v.label}</p>
                          <p className="text-[9px] text-slate-500">{v.sizeMm[0]}x{v.sizeMm[1]}mm</p>
                          <button
                            onClick={() => handleDownloadSvg(v.engraveSvg, `${v.productType}-engrave.svg`)}
                            className="mt-1.5 flex w-full items-center justify-center gap-1 rounded bg-slate-700/50 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-600/50"
                          >
                            <Download className="h-2.5 w-2.5" /> SVG
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Export Package Panel ── */}
            {bottomPanel === 'export' && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <Package className="h-3.5 w-3.5 text-sky-400" /> Export Product Pack V2
                  </h3>
                  <p className="mb-3 text-[10px] text-slate-400">
                    Complete ZIP with production SVGs, optimized cuts, simulation preview, mockups, variants, and full production + validation reports.
                  </p>
                  <button
                    onClick={handleExportZip}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl"
                  >
                    <Download className="h-4 w-4" /> Download Product Pack V2 (.zip)
                  </button>
                </div>
                <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
                  <h3 className="mb-3 text-xs font-semibold text-slate-200">Package Contents</h3>
                  <div className="space-y-1">
                    <ExportFileRow name="engrave.svg" desc="Engraving layer" />
                    <ExportFileRow name="cut.svg" desc="Cut outline" />
                    <ExportFileRow name="combined.svg" desc="Engrave + Cut" />
                    {result.optimizedCutSvg && <ExportFileRow name="optimized-cut.svg" desc="Optimized cut path" />}
                    {result.laserSimulation && <ExportFileRow name="simulation-preview.png" desc="Laser simulation" />}
                    {result.multilayer && <ExportFileRow name="multilayer/" desc="Layer SVGs" />}
                    <ExportFileRow name="mockups/" desc="Scene PNGs" />
                    {result.variants && result.variants.length > 0 && <ExportFileRow name="variants/" desc="Variant SVGs" />}
                    <ExportFileRow name="production-report.json" desc="Full production data" />
                    {result.fileValidation && <ExportFileRow name="validation-report.json" desc="File validation" />}
                    {result.cutPathOptimization && <ExportFileRow name="machine-order.json" desc="Cut sequence" />}
                  </div>
                </div>
              </div>
            )}
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
      <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">{icon} {title}</h3>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange, accent }: { label: string; checked: boolean; onChange: (v: boolean) => void; accent?: string }) {
  const bg = checked
    ? accent === 'orange' ? 'bg-orange-500' : accent === 'red' ? 'bg-red-500' : accent === 'green' ? 'bg-emerald-500' : accent === 'violet' ? 'bg-violet-500' : 'bg-sky-500'
    : 'bg-slate-700';
  return (
    <label className="flex items-center justify-between text-[11px] text-slate-300 cursor-pointer">
      <span>{label}</span>
      <div onClick={(e) => { e.preventDefault(); onChange(!checked); }}
        className={`relative h-5 w-9 rounded-full transition-colors ${bg}`}>
        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
    </label>
  );
}

function SliderOption({ label, value, min, max, step, suffix, onChange }: {
  label: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-slate-300">{label}</label>
        <span className="text-[11px] text-slate-500">{step < 1 ? value.toFixed(2) : value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-sky-500" />
    </div>
  );
}

function PreviewPane({ children }: { children: React.ReactNode }) {
  return <div className="flex w-full flex-col items-center gap-3">{children}</div>;
}

function DlBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs text-slate-200 hover:bg-slate-700 transition-colors">
      <Download className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function IntelCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-3">
      <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">{icon}{title}</h4>
      {children}
    </div>
  );
}

function WarningRow({ severity, message, compact }: { severity: string; message: string; compact?: boolean }) {
  return (
    <div className={`flex items-start gap-1.5 rounded-lg ${compact ? 'p-1 text-[10px]' : 'p-2 text-[11px]'} ${
      severity === 'high' ? 'bg-red-900/20 text-red-300'
        : severity === 'medium' ? 'bg-amber-900/20 text-amber-300'
          : 'bg-emerald-900/10 text-emerald-300'
    }`}>
      <AlertTriangle className={`mt-0.5 h-3 w-3 shrink-0 ${
        severity === 'high' ? 'text-red-400' : severity === 'medium' ? 'text-amber-400' : 'text-emerald-400'
      }`} />
      <span className="leading-tight">{message}</span>
    </div>
  );
}

function MetricCard({ label, value, warn }: { label: string; value: number; warn: boolean }) {
  return (
    <div className={`rounded-lg p-2 text-center ${warn ? 'bg-amber-900/20 border border-amber-800/30' : 'bg-slate-800/50'}`}>
      <div className={`text-lg font-bold ${warn ? 'text-amber-400' : 'text-slate-200'}`}>{value}</div>
      <div className="text-[9px] text-slate-500">{label}</div>
    </div>
  );
}

function ScoreGauge({ score, label, small }: { score: number; label: string; small?: boolean }) {
  const color = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';
  const ring = score >= 80 ? 'border-emerald-500/30' : score >= 50 ? 'border-amber-500/30' : 'border-red-500/30';
  return (
    <div className="flex flex-col items-center">
      <div className={`flex items-center justify-center rounded-full border-4 ${ring} ${small ? 'h-12 w-12' : 'h-16 w-16'}`}>
        <span className={`font-bold ${color} ${small ? 'text-sm' : 'text-xl'}`}>{score}</span>
      </div>
      <span className="mt-1 text-[10px] text-slate-500">{label}</span>
    </div>
  );
}

function SimMetric({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    sky: 'text-sky-400', amber: 'text-amber-400', red: 'text-red-400',
    orange: 'text-orange-400', cyan: 'text-cyan-400', emerald: 'text-emerald-400',
  };
  return (
    <div className="rounded-lg bg-slate-800/50 p-2 text-center">
      <div className={`text-xs font-bold ${colorMap[color] || 'text-slate-200'}`}>{value}</div>
      <div className="text-[9px] text-slate-500">{label}</div>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    contrast: { bg: 'bg-amber-900/30', text: 'text-amber-400' },
    density: { bg: 'bg-orange-900/30', text: 'text-orange-400' },
    size: { bg: 'bg-sky-900/30', text: 'text-sky-400' },
    aesthetic: { bg: 'bg-violet-900/30', text: 'text-violet-400' },
    production: { bg: 'bg-emerald-900/30', text: 'text-emerald-400' },
    material: { bg: 'bg-amber-900/30', text: 'text-amber-400' },
  };
  const c = map[category] || { bg: 'bg-slate-800', text: 'text-slate-400' };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${c.bg} ${c.text}`}>
      {category}
    </span>
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
  const idx = STAGE_ORDER.indexOf(stage);
  const pct = idx < 0 ? 0 : Math.round(((idx + 1) / STAGE_ORDER.length) * 100);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
      <div className="h-full rounded-full bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500 transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}
