'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Upload, Sparkles, Download, Image, Layers, DollarSign, Clock, Ruler,
  RotateCcw, Package, Eye, AlertTriangle, Shield, Palette, Box, Zap,
  ChevronDown, ChevronUp, LayoutGrid, Activity, CheckCircle, XCircle,
  Gauge, Scissors, FileCheck, Recycle, Lightbulb, Target,
  Brain, Factory, ShoppingBag, RefreshCw, Cpu, TrendingUp,
  Send, Monitor, Loader2 as Loader2Icon, Store, Globe,
} from 'lucide-react';
import { useAnalytics } from '@/lib/analytics/useAnalytics';
import { useLanguage } from '@/lib/i18n/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';
import { refreshEntitlements } from '@/lib/entitlements/client';
import type {
  ProductType, ProcessingStage, GenerateOptions, GenerateResponse,
  MaterialId, StyleId, BatchItem, MachineType,
} from '../types';
import {
  PRODUCT_TYPES, DEFAULT_OPTIONS, MATERIAL_PROFILES, STYLE_OPTIONS,
  MOCKUP_SCENES, MACHINE_PROFILES,
} from '../types';

type PreviewTab =
  | 'engrave' | 'cut' | 'combined' | 'score' | 'silhouette' | 'optimized-cut'
  | 'simulation' | 'structural' | 'multilayer' | 'mockups'
  | 'batch-layout' | 'refinement';

const STAGE_LABELS: Record<ProcessingStage, string> = {
  idle: '',
  uploading: 'Uploading...',
  enhancing: 'Enhancing photo...',
  'subject-analysis': 'Detecting subject...',
  'product-intelligence': 'AI product intelligence...',
  'style-transform': 'Applying style...',
  'contour-extraction': 'Extracting contour...',
  'template-generation': 'Building product template...',
  'svg-generation': 'Generating layered SVGs...',
  'ai-generation': 'AI generating engraving...',
  'design-refinement': 'AI refining design...',
  'production-insights': 'Calculating production...',
  simulation: 'Running laser simulation...',
  'structural-analysis': 'Analyzing structural integrity...',
  'cut-optimization': 'Optimizing cut paths...',
  'file-validation': 'Validating laser files...',
  multilayer: 'Generating layers...',
  'risk-analysis': 'Analyzing risks...',
  'waste-analysis': 'Optimizing material usage...',
  'batch-builder': 'Building production batch...',
  variants: 'Creating variants...',
  mockups: 'Rendering mockups...',
  'market-pack': 'Generating market pack...',
  'design-coach': 'AI design coaching...',
  complete: 'Complete!',
  error: 'Error occurred',
};

const STAGE_ORDER: ProcessingStage[] = [
  'enhancing', 'subject-analysis', 'style-transform', 'contour-extraction',
  'template-generation', 'svg-generation', 'production-insights',
  'risk-analysis', 'simulation', 'structural-analysis', 'mockups', 'complete',
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
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context failed')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1]);
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = dataUrl;
  });
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

/* ═══════════════════════════════════════════════════════════════════ */
/*  SUB-COMPONENTS                                                    */
/* ═══════════════════════════════════════════════════════════════════ */

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (<div className="space-y-2"><h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">{icon} {title}</h3>{children}</div>);
}

function Toggle({ label, checked, onChange, accent }: { label: string; checked: boolean; onChange: (v: boolean) => void; accent?: string }) {
  const bg = checked
    ? accent === 'orange' ? 'bg-orange-500' : accent === 'red' ? 'bg-red-500' : accent === 'green' ? 'bg-emerald-500' : accent === 'violet' ? 'bg-violet-500' : 'bg-sky-500'
    : 'bg-slate-700';
  return (
    <label className="flex items-center justify-between text-[11px] text-slate-300 cursor-pointer">
      <span>{label}</span>
      <div onClick={(e) => { e.preventDefault(); onChange(!checked); }} className={`relative h-5 w-9 rounded-full transition-colors ${bg}`}>
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
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-sky-500" />
    </div>
  );
}

function PreviewPane({ children }: { children: React.ReactNode }) {
  return <div className="flex w-full flex-col items-center gap-3">{children}</div>;
}

function DlBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (<button onClick={onClick} className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs text-slate-200 hover:bg-slate-700 transition-colors"><Download className="h-3.5 w-3.5" /> {label}</button>);
}

function IntelCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (<div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-3"><h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">{icon}{title}</h4>{children}</div>);
}

function WarningRow({ severity, message, confidence, compact }: { severity: string; message: string; confidence?: number; compact?: boolean }) {
  return (
    <div className={`flex items-start gap-1.5 rounded-lg ${compact ? 'p-1 text-[10px]' : 'p-2 text-[11px]'} ${
      severity === 'critical' ? 'bg-red-900/30 text-red-300' : severity === 'high' ? 'bg-red-900/20 text-red-300' : severity === 'medium' ? 'bg-amber-900/20 text-amber-300' : 'bg-emerald-900/10 text-emerald-300'
    }`}>
      <AlertTriangle className={`mt-0.5 h-3 w-3 shrink-0 ${severity === 'critical' || severity === 'high' ? 'text-red-400' : severity === 'medium' ? 'text-amber-400' : 'text-emerald-400'}`} />
      <span className="leading-tight">{message}</span>
      {confidence !== undefined && <span className="ml-auto shrink-0 text-[9px] text-slate-500">{confidence}%</span>}
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
  const cm: Record<string, string> = { sky: 'text-sky-400', amber: 'text-amber-400', red: 'text-red-400', orange: 'text-orange-400', cyan: 'text-cyan-400', emerald: 'text-emerald-400' };
  return (<div className="rounded-lg bg-slate-800/50 p-2 text-center"><div className={`text-xs font-bold ${cm[color] || 'text-slate-200'}`}>{value}</div><div className="text-[9px] text-slate-500">{label}</div></div>);
}

function CategoryBadge({ category }: { category: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    contrast: { bg: 'bg-amber-900/30', text: 'text-amber-400' }, density: { bg: 'bg-orange-900/30', text: 'text-orange-400' },
    size: { bg: 'bg-sky-900/30', text: 'text-sky-400' }, aesthetic: { bg: 'bg-violet-900/30', text: 'text-violet-400' },
    production: { bg: 'bg-emerald-900/30', text: 'text-emerald-400' }, material: { bg: 'bg-amber-900/30', text: 'text-amber-400' },
  };
  const c = map[category] || { bg: 'bg-slate-800', text: 'text-slate-400' };
  return (<span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${c.bg} ${c.text}`}>{category}</span>);
}

function ExportFileRow({ name, desc }: { name: string; desc: string }) {
  return (<div className="flex items-center justify-between text-[10px]"><span className="font-mono text-slate-300">{name}</span><span className="text-slate-500">{desc}</span></div>);
}

function ProgressBar({ stage }: { stage: ProcessingStage }) {
  const idx = STAGE_ORDER.indexOf(stage);
  const pct = idx < 0 ? 0 : Math.round(((idx + 1) / STAGE_ORDER.length) * 100);
  return (<div className="h-2 w-full overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500 transition-all duration-500" style={{ width: `${pct}%` }} /></div>);
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                    */
/* ═══════════════════════════════════════════════════════════════════ */

export function PhotoProductAITool() {
  const analytics = useAnalytics('photo-product-ai');
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [showLaserParams, setShowLaserParams] = useState(false);
  const [selectedMockup, setSelectedMockup] = useState(0);
  const [selectedLayer, setSelectedLayer] = useState(0);
  const [bottomPanel, setBottomPanel] = useState<'intelligence' | 'coach' | 'batch' | 'market' | 'export'>('intelligence');
  const [batchMode, setBatchMode] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const batchInputRef = useRef<HTMLInputElement>(null);

  const mat = MATERIAL_PROFILES[options.material];
  const mach = MACHINE_PROFILES[options.machineType];

  const handleFile = useCallback((file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) { setError('Please upload a JPG, PNG, or WEBP image.'); return; }
    if (file.size > MAX_FILE_SIZE) { setError('File too large. Maximum size is 15MB.'); return; }
    setError(null); setUploadedFileName(file.name); setResult(null); setStage('idle');
    const reader = new FileReader();
    reader.onload = (e) => setUploadedImage(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }, [handleFile]);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFile(f); }, [handleFile]);

  const handleGenerate = async () => {
    if (!uploadedImage) return;
    setError(null); setResult(null); analytics.trackAIGeneration();
    try {
      setStage('enhancing');
      const base64 = await resizeImageToBase64(uploadedImage);
      setStage('subject-analysis'); await delay(100);
      setStage('style-transform');
      const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      const at = typeof window !== 'undefined' ? window.localStorage.getItem('accessToken') : null;
      if (at) authHeaders['Authorization'] = `Bearer ${at}`;
      const response = await fetch('/api/ai/photo-product', {
        method: 'POST', headers: authHeaders, credentials: 'include',
        body: JSON.stringify({ imageBase64: base64, productType: selectedProduct, options }),
      });
      if (!response.ok) { const ed = await response.json().catch(() => null); throw new Error(ed?.error || `Generation failed (${response.status})`); }
      setStage('contour-extraction'); await delay(80);
      setStage('template-generation'); await delay(80);
      setStage('svg-generation'); await delay(80);
      setStage('production-insights'); await delay(60);
      setStage('risk-analysis'); await delay(60);
      setStage('simulation'); await delay(60);
      setStage('structural-analysis'); await delay(60);
      const data: GenerateResponse = await response.json();
      setStage('mockups'); await delay(60);
      setResult(data); setStage('complete'); setPreviewTab('combined');
      refreshEntitlements();
    } catch (err: any) {
      console.error('Photo product generation failed:', err);
      setError(err.message || 'Generation failed.'); setStage('error');
    }
  };

  const handleReset = () => {
    setUploadedImage(null); setUploadedFileName(''); setResult(null); setStage('idle');
    setError(null); setOptions({ ...DEFAULT_OPTIONS }); setSelectedProduct('engraved-frame');
    setBatchItems([]); setBatchMode(false); setBatchProcessing(false);
  };

  const handleBatchFiles = useCallback((files: FileList) => {
    const vf = Array.from(files).filter((f) => ACCEPTED_TYPES.includes(f.type) && f.size <= MAX_FILE_SIZE).slice(0, 10);
    if (vf.length === 0) { setError('No valid images selected.'); return; }
    setError(null);
    const items: BatchItem[] = []; let loaded = 0;
    vf.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        items.push({ id: `batch-${Date.now()}-${i}`, fileName: file.name, imageBase64: (e.target?.result as string).split(',')[1] || '', status: 'queued', progress: 0, result: null, error: null });
        loaded++;
        if (loaded === vf.length) { setBatchItems(items); setBatchMode(true); }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleBatchGenerate = async () => {
    if (batchItems.length === 0) return;
    setBatchProcessing(true); setError(null); analytics.trackAIGeneration();
    setBatchItems((prev) => prev.map((it) => ({ ...it, status: 'processing' as const, progress: 10 })));
    try {
      const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      const at = typeof window !== 'undefined' ? window.localStorage.getItem('accessToken') : null;
      if (at) authHeaders['Authorization'] = `Bearer ${at}`;
      const resized = await Promise.all(batchItems.map(async (it) => ({ fileName: it.fileName, imageBase64: await resizeImageToBase64(`data:image/jpeg;base64,${it.imageBase64}`) })));
      setBatchItems((prev) => prev.map((it) => ({ ...it, progress: 30 })));
      const response = await fetch('/api/ai/photo-product/batch', { method: 'POST', headers: authHeaders, credentials: 'include', body: JSON.stringify({ images: resized, productType: selectedProduct, options }) });
      if (!response.ok) { const ed = await response.json().catch(() => null); throw new Error(ed?.error || `Batch failed (${response.status})`); }
      const data = await response.json();
      setBatchItems(data.items.map((it: any) => ({ ...it, progress: 100, status: it.result ? 'complete' : 'error' })));
      refreshEntitlements();
    } catch (err: any) {
      setError(err.message || 'Batch generation failed.');
      setBatchItems((prev) => prev.map((it) => ({ ...it, status: 'error' as const, progress: 100, error: err.message })));
    } finally { setBatchProcessing(false); }
  };

  const svgForExport = (svg: string): string => svg.replace(/viewBox="([^"]+)"\s+data-width-mm="([^"]+)"\s+data-height-mm="([^"]+)"/, 'width="$2mm" height="$3mm" viewBox="$1"');
  const b64toUint8 = (b64: string) => { const raw = atob(b64); const arr = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i); return arr; };
  const downloadBlob = (blob: Blob, name: string) => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); };

  const handleBatchExportAll = async () => {
    const ci = batchItems.filter((it) => it.status === 'complete' && it.result);
    if (ci.length === 0) return; analytics.trackExport();
    try {
      const JSZip = (await import('jszip')).default; const zip = new JSZip();
      ci.forEach((it, i) => { const r = it.result!; const f = zip.folder(`${i + 1}-${it.fileName.replace(/\.[^.]+$/, '')}`)!; f.file('engrave.svg', svgForExport(r.engraveSvg)); f.file('cut.svg', svgForExport(r.cutSvg)); f.file('combined.svg', svgForExport(r.combinedSvg)); if (r.optimizedCutSvg) f.file('optimized-cut.svg', svgForExport(r.optimizedCutSvg)); if (r.engravePreviewPng) f.file('preview.png', b64toUint8(r.engravePreviewPng)); f.file('production-report.json', JSON.stringify(r.productionInsights, null, 2)); });
      downloadBlob(await zip.generateAsync({ type: 'blob' }), `batch-${selectedProduct}-${Date.now()}.zip`);
    } catch (err) { setError('Batch export failed.'); }
  };

  const handleExportZip = async () => {
    if (!result) return; analytics.trackExport();
    try {
      const JSZip = (await import('jszip')).default; const zip = new JSZip();
      // Core laser files — LightBurn compatible
      zip.file('cut.svg', svgForExport(result.cutSvg));
      zip.file('engrave.svg', svgForExport(result.engraveSvg));
      zip.file('combined.svg', svgForExport(result.combinedSvg));
      if (result.scoreSvg) zip.file('score.svg', svgForExport(result.scoreSvg));
      if (result.engravePreviewPng) zip.file('preview.png', b64toUint8(result.engravePreviewPng));
      // Production info JSON
      if (result.productionInfo) zip.file('production-info.json', JSON.stringify(result.productionInfo, null, 2));
      else zip.file('production-info.json', JSON.stringify(result.productionInsights, null, 2));
      // Silhouette
      if (result.contourExtraction?.silhouettePng) zip.file('silhouette.png', b64toUint8(result.contourExtraction.silhouettePng));
      // Additional assets in subfolders
      if (result.mockups?.length) { const mk = zip.folder('mockups')!; result.mockups.forEach((m) => mk.file(`${m.scene}.png`, b64toUint8(m.png))); }
      if (result.variants?.length) { const vf = zip.folder('variants')!; result.variants.forEach((v) => { vf.file(`${v.productType}-engrave.svg`, svgForExport(v.engraveSvg)); vf.file(`${v.productType}-cut.svg`, svgForExport(v.cutSvg)); }); }
      if (result.multilayer) { const ml = zip.folder('multilayer')!; result.multilayer.layers.forEach((l) => ml.file(`layer-${l.index + 1}.svg`, svgForExport(l.svg))); }
      // Reports
      const rp = zip.folder('reports')!;
      rp.file('risk-warnings.json', JSON.stringify(result.riskWarnings, null, 2));
      if (result.laserSimulation) rp.file('laser-simulation.json', JSON.stringify(result.laserSimulation, null, 2));
      if (result.structuralAnalysis) rp.file('structural-analysis.json', JSON.stringify(result.structuralAnalysis, null, 2));
      if (result.subjectDetection) rp.file('subject-detection.json', JSON.stringify(result.subjectDetection, null, 2));
      zip.file('README.txt', `${result.description}\n\nFiles:\n- cut.svg: Cut layer (red) — import in LightBurn as Line mode\n- engrave.svg: Engrave layer (black) — import as Image/Fill mode\n${result.scoreSvg ? '- score.svg: Score layer (blue) — import as Line mode, low power\n' : ''}- combined.svg: All layers merged\n- preview.png: Engraving preview\n- production-info.json: Full production metadata\n`);
      downloadBlob(await zip.generateAsync({ type: 'blob' }), `laser-product-${selectedProduct}-${Date.now()}.zip`);
    } catch (err) { setError('Export failed.'); }
  };

  const handleDownloadSvg = (svgContent: string, filename: string) => downloadBlob(new Blob([svgForExport(svgContent)], { type: 'image/svg+xml' }), filename);
  const isProcessing = stage !== 'idle' && stage !== 'complete' && stage !== 'error';

  return (
    <div className="flex h-full flex-col gap-4 lg:flex-row lg:gap-6">
      {/* LEFT PANEL */}
      <div className="w-full shrink-0 space-y-3 overflow-y-auto lg:w-[380px]">
        <V3Header result={result} />
        <UploadZone isDragging={isDragging} uploadedImage={uploadedImage} uploadedFileName={uploadedFileName} fileInputRef={fileInputRef} handleDrop={handleDrop} handleDragOver={handleDragOver} handleDragLeave={handleDragLeave} handleFileInput={handleFileInput} />
        <BatchToggle batchMode={batchMode} setBatchMode={setBatchMode} setBatchItems={setBatchItems} />
        {batchMode && <BatchPanel batchInputRef={batchInputRef} batchItems={batchItems} batchProcessing={batchProcessing} handleBatchFiles={handleBatchFiles} handleBatchGenerate={handleBatchGenerate} handleBatchExportAll={handleBatchExportAll} />}
        {(uploadedImage || batchMode) && (
          <>
            <Section title="Machine Profile" icon={<Cpu className="h-3.5 w-3.5 text-cyan-400" />}>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.entries(MACHINE_PROFILES) as [MachineType, typeof MACHINE_PROFILES[MachineType]][]).map(([id, m]) => (
                  <button key={id} onClick={() => setOptions((o) => ({ ...o, machineType: id }))} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] transition-all ${options.machineType === id ? 'border-cyan-500/70 bg-cyan-500/10 text-cyan-300 shadow-sm shadow-cyan-500/10' : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600'}`}>
                    <span>{m.icon}</span><span className="truncate font-medium">{m.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1 text-[9px] text-slate-500"><span>Max: {mach.maxSpeedMmS}mm/s</span><span>Power: {mach.maxPowerW}W</span><span>DPI: {mach.engravingDpi}</span></div>
            </Section>
            <Section title="Material" icon={<Box className="h-3.5 w-3.5 text-amber-400" />}>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.entries(MATERIAL_PROFILES) as [MaterialId, typeof MATERIAL_PROFILES[MaterialId]][]).map(([id, m]) => (
                  <button key={id} onClick={() => setOptions((o) => ({ ...o, material: id, kerfMm: m.kerfCoefficient, laserSpeedMmS: m.recommendedSpeedMmS, laserPowerPct: m.recommendedPowerPct }))} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] transition-all ${options.material === id ? 'border-amber-500/70 bg-amber-500/10 text-amber-300 shadow-sm shadow-amber-500/10' : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600'}`}>
                    <span>{m.icon}</span><span className="truncate font-medium">{m.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1 text-[9px] text-slate-500"><span>Kerf: {mat.kerfCoefficient}mm</span><span>Thick: {mat.thicknessMm}mm</span><span>${mat.costPerM2}/m²</span><span>Burn: {mat.burnCoefficient}</span></div>
            </Section>
            <Section title="Engraving Style" icon={<Palette className="h-3.5 w-3.5 text-violet-400" />}>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.entries(STYLE_OPTIONS) as [StyleId, typeof STYLE_OPTIONS[StyleId]][]).map(([id, s]) => (
                  <button key={id} onClick={() => setOptions((o) => ({ ...o, style: id }))} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] transition-all ${options.style === id ? 'border-violet-500/70 bg-violet-500/10 text-violet-300 shadow-sm shadow-violet-500/10' : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600'}`}>
                    <span>{s.icon}</span><span className="truncate font-medium">{s.label}</span>
                  </button>
                ))}
              </div>
            </Section>
            <Section title="Product Type" icon={<LayoutGrid className="h-3.5 w-3.5 text-sky-400" />}>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.entries(PRODUCT_TYPES) as [ProductType, typeof PRODUCT_TYPES[ProductType]][]).map(([key, val]) => (
                  <button key={key} onClick={() => setSelectedProduct(key)} className={`rounded-lg border px-2 py-1.5 text-left text-[11px] transition-all ${selectedProduct === key ? 'border-sky-500/70 bg-sky-500/10 text-sky-300 shadow-sm shadow-sky-500/10' : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600'}`}>
                    <span className="mr-1">{val.icon}</span><span className="font-medium">{val.label}</span><span className="ml-1 text-[9px] text-slate-600">{val.sizeMm[0]}x{val.sizeMm[1]}</span>
                  </button>
                ))}
              </div>
            </Section>
            <Section title="AI Features" icon={<Sparkles className="h-3.5 w-3.5 text-yellow-400" />}>
              <div className="space-y-1.5">
                <Toggle label="Enhance Photo" checked={options.enhancePhoto} onChange={(v) => setOptions((o) => ({ ...o, enhancePhoto: v }))} />
                <Toggle label="Product Intelligence" checked={options.productIntelligence} onChange={(v) => setOptions((o) => ({ ...o, productIntelligence: v }))} accent="violet" />
                <Toggle label="Auto Refine Design" checked={options.autoRefine} onChange={(v) => setOptions((o) => ({ ...o, autoRefine: v }))} accent="violet" />
                <Toggle label="Ultra Real Simulation" checked={options.ultraRealSimulation} onChange={(v) => setOptions((o) => ({ ...o, ultraRealSimulation: v }))} accent="orange" />
                <Toggle label="Structural Analysis" checked={options.structuralAnalysis} onChange={(v) => setOptions((o) => ({ ...o, structuralAnalysis: v }))} accent="red" />
                <Toggle label="Cut Path Optimization" checked={options.cutPathOptimization} onChange={(v) => setOptions((o) => ({ ...o, cutPathOptimization: v }))} accent="green" />
                <Toggle label="File Validation" checked={options.fileValidation} onChange={(v) => setOptions((o) => ({ ...o, fileValidation: v }))} />
                <Toggle label="Waste Analysis" checked={options.wasteOptimization} onChange={(v) => setOptions((o) => ({ ...o, wasteOptimization: v }))} />
                <Toggle label="Design AI Coach" checked={options.designCoach} onChange={(v) => setOptions((o) => ({ ...o, designCoach: v }))} accent="violet" />
                <Toggle label="Batch Builder" checked={options.batchBuilder} onChange={(v) => setOptions((o) => ({ ...o, batchBuilder: v }))} accent="orange" />
                <Toggle label="Market-Ready Pack" checked={options.marketPack} onChange={(v) => setOptions((o) => ({ ...o, marketPack: v }))} accent="green" />
                <Toggle label="Style Consistency" checked={options.styleConsistency} onChange={(v) => setOptions((o) => ({ ...o, styleConsistency: v }))} />
                <Toggle label="Multilayer" checked={options.generateMultilayer} onChange={(v) => setOptions((o) => ({ ...o, generateMultilayer: v }))} />
                <Toggle label="Product Variants" checked={options.generateVariants} onChange={(v) => setOptions((o) => ({ ...o, generateVariants: v }))} />
                <Toggle label="Invert Engraving" checked={options.invertEngraving} onChange={(v) => setOptions((o) => ({ ...o, invertEngraving: v }))} />
                <Toggle label="Include Cut Frame" checked={options.includeFrame} onChange={(v) => setOptions((o) => ({ ...o, includeFrame: v }))} />
              </div>
            </Section>
            <button onClick={() => setShowLaserParams(!showLaserParams)} className="flex w-full items-center justify-between rounded-lg border border-orange-800/30 bg-orange-900/10 px-3 py-2 text-xs text-orange-300 hover:bg-orange-900/20">
              <span className="flex items-center gap-1.5"><Zap className="h-3 w-3" /> Laser Parameters</span>
              {showLaserParams ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showLaserParams && (
              <div className="space-y-3 rounded-lg border border-orange-800/20 bg-slate-900/60 p-3">
                <SliderOption label="Speed" value={options.laserSpeedMmS} min={50} max={Math.min(mach.maxSpeedMmS, 2000)} step={10} suffix=" mm/s" onChange={(v) => setOptions((o) => ({ ...o, laserSpeedMmS: v }))} />
                <SliderOption label="Power" value={options.laserPowerPct} min={5} max={100} step={1} suffix="%" onChange={(v) => setOptions((o) => ({ ...o, laserPowerPct: v }))} />
                <SliderOption label="Passes" value={options.laserPasses} min={1} max={5} step={1} suffix="x" onChange={(v) => setOptions((o) => ({ ...o, laserPasses: v }))} />
                <div className="rounded bg-slate-800/50 p-2 text-[10px] text-slate-500">Recommended for {mat.label} on {mach.label}: {mat.recommendedSpeedMmS}mm/s @ {mat.recommendedPowerPct}%</div>
              </div>
            )}
            <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex w-full items-center justify-between rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:bg-slate-800/50">
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
            {error && (<div className="flex items-start gap-2 rounded-lg border border-red-800/50 bg-red-900/20 p-3 text-xs text-red-300"><XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{error}</span></div>)}
            <div className="space-y-2">
              <button onClick={handleGenerate} disabled={isProcessing} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition-all hover:shadow-xl hover:shadow-violet-500/30 disabled:cursor-not-allowed disabled:opacity-50">
                {isProcessing ? (<><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />{STAGE_LABELS[stage]}</>) : (<><Sparkles className="h-4 w-4" />{result ? 'Regenerate Product' : 'Generate Laser Product'}</>)}
              </button>
              {(result || uploadedImage) && (<button onClick={handleReset} disabled={isProcessing} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-400 hover:bg-slate-800 disabled:opacity-50"><RotateCcw className="h-3 w-3" /> Start Over</button>)}
            </div>
          </>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Subject Detection + Best Products Bar (V4) */}
        {result?.subjectDetection && (
          <div className="mb-3 rounded-xl border border-sky-700/30 bg-sky-900/10 p-3">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Brain className="h-4 w-4 text-sky-400" />
              <h3 className="text-xs font-semibold text-sky-300">AI Subject Analysis</h3>
              <span className="rounded-full bg-sky-800/40 px-2 py-0.5 text-[10px] text-sky-300">{result.subjectDetection.subjectType} — {result.subjectDetection.confidenceScore}%</span>
              <span className="rounded-full bg-slate-800/60 px-2 py-0.5 text-[10px] text-slate-400">{result.subjectDetection.subjectLabel}</span>
              {result.contourExtraction && (
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] ${result.contourExtraction.method === 'ai-silhouette' ? 'bg-emerald-800/40 text-emerald-300' : 'bg-amber-800/40 text-amber-300'}`}>
                  {result.contourExtraction.method === 'ai-silhouette' ? '✓ AI Contour' : '⚠ Geometric'} ({result.contourExtraction.pointCount} pts)
                </span>
              )}
            </div>
            {result.productTemplate && (
              <div className="flex gap-3 text-[10px] text-slate-500 flex-wrap">
                <span>Product: <strong className="text-slate-300">{result.productTemplate.totalWidthMm}×{result.productTemplate.totalHeightMm}mm</strong></span>
                <span>Engrave zone: {result.productTemplate.engraveWidthMm}×{result.productTemplate.engraveHeightMm}mm</span>
                {result.productTemplate.hasHangingHole && <span className="text-amber-400">🔗 Hole</span>}
                {result.productTemplate.hasScoreLines && <span className="text-blue-400">✏️ Score</span>}
              </div>
            )}
            {result.subjectDetection.suggestedProducts.length > 0 && (
              <>
                <div className="mt-2 mb-1 text-[10px] font-semibold text-emerald-400">👉 Best Products From Your Photo</div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {result.subjectDetection.suggestedProducts.map((type) => {
                    const meta = PRODUCT_TYPES[type as ProductType];
                    if (!meta) return null;
                    return (
                      <button key={type} onClick={() => setSelectedProduct(type as ProductType)} className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all ${selectedProduct === type ? 'border-sky-500/70 bg-sky-500/10 text-sky-300' : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600'}`}>
                        <span>{meta.icon}</span><span className="font-medium">{meta.label}</span>
                        <span className={`rounded-full px-1 py-0.5 text-[8px] ${meta.profitTier === 'premium' ? 'bg-violet-900/50 text-violet-300' : meta.profitTier === 'high' ? 'bg-emerald-900/50 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>{meta.profitTier}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
        {!result?.subjectDetection && result?.productSuggestions && result.productSuggestions.length > 0 && (
          <div className="mb-3"><h3 className="mb-2 text-xs font-semibold text-slate-300">AI Suggested Products</h3>
            <div className="flex gap-2 overflow-x-auto pb-1">{result.productSuggestions.map((s) => (<button key={s.type} onClick={() => setSelectedProduct(s.type as ProductType)} className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all ${selectedProduct === s.type ? 'border-sky-500/70 bg-sky-500/10 text-sky-300' : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600'}`}><span>{s.icon}</span><span className="font-medium">{s.label}</span><span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500">{Math.round(s.confidence * 100)}%</span></button>))}</div>
          </div>
        )}

        {/* Preview Tabs */}
        {result && (
          <div className="flex gap-0.5 overflow-x-auto border-b border-slate-700/50">
            {([
              { key: 'combined' as const, label: 'Combined', icon: Eye },
              { key: 'engrave' as const, label: 'Engrave', icon: Image },
              { key: 'cut' as const, label: 'Cut', icon: Scissors },
              ...(result.scoreSvg ? [{ key: 'score' as const, label: 'Score', icon: Palette }] : []),
              ...(result.contourExtraction?.silhouettePng ? [{ key: 'silhouette' as const, label: 'Silhouette', icon: Target }] : []),
              { key: 'simulation' as const, label: 'Laser Sim', icon: Zap },
              ...(result.structuralAnalysis ? [{ key: 'structural' as const, label: 'Structural', icon: Shield }] : []),
              ...(result.multilayer ? [{ key: 'multilayer' as const, label: 'Multilayer', icon: Layers }] : []),
              { key: 'mockups' as const, label: 'Mockups', icon: Package },
              ...(result.productionBatch ? [{ key: 'batch-layout' as const, label: 'Batch', icon: Factory }] : []),
              ...(result.refinement ? [{ key: 'refinement' as const, label: 'Refined', icon: RefreshCw }] : []),
            ]).map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setPreviewTab(key)} className={`flex shrink-0 items-center gap-1 px-3 py-2 text-xs font-medium transition-all ${previewTab === key ? 'border-b-2 border-sky-500 text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}>
                <Icon className="h-3 w-3" />{label}
              </button>
            ))}
          </div>
        )}

        {/* Preview Canvas */}
        <div className="flex flex-1 items-start justify-center overflow-auto rounded-b-xl bg-slate-900/30 p-4" style={{ minHeight: 360 }}>
          {!uploadedImage && !isProcessing && (<div className="text-center"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/50"><Image className="h-8 w-8 text-slate-600" /></div><p className="text-sm font-medium text-slate-400">Upload a photo to get started</p><p className="mt-1 text-xs text-slate-600">Upload a photo → get a complete laser product design</p></div>)}
          {uploadedImage && !result && !isProcessing && (<div className="text-center"><img src={uploadedImage} alt="Preview" className="mx-auto max-h-[420px] max-w-full rounded-xl shadow-2xl" /><p className="mt-3 text-sm text-slate-400">Click <strong className="text-sky-400">Generate Laser Product</strong></p></div>)}
          {isProcessing && (<div className="w-full max-w-sm text-center"><div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-sky-500" /><p className="text-sm font-semibold text-slate-200">{STAGE_LABELS[stage]}</p><div className="mx-auto mt-4"><ProgressBar stage={stage} /></div><div className="mt-4 grid grid-cols-2 gap-1">{STAGE_ORDER.map((s) => { const idx = STAGE_ORDER.indexOf(stage); const sIdx = STAGE_ORDER.indexOf(s); const done = sIdx < idx; const current = s === stage; return (<div key={s} className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] ${done ? 'text-emerald-500' : current ? 'text-sky-400 font-medium' : 'text-slate-600'}`}>{done ? <CheckCircle className="h-2.5 w-2.5" /> : current ? <Activity className="h-2.5 w-2.5 animate-pulse" /> : <div className="h-2.5 w-2.5 rounded-full border border-slate-700" />}{STAGE_LABELS[s]?.replace('...', '')}</div>); })}</div></div>)}
          {result && previewTab === 'engrave' && (<PreviewPane><img src={`data:image/jpeg;base64,${result.engravePreviewPng}`} alt="Engrave" className="w-full max-w-2xl rounded-lg shadow-2xl object-contain" style={options.invertEngraving ? { filter: 'invert(1)' } : undefined} /><DlBtn onClick={() => handleDownloadSvg(result.engraveSvg, 'engrave.svg')} label="Download Engrave SVG" /></PreviewPane>)}
          {result && previewTab === 'cut' && (<PreviewPane><div className="w-full max-w-2xl overflow-auto rounded-lg border border-slate-700 bg-white p-4 [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: result.cutSvg }} /><DlBtn onClick={() => handleDownloadSvg(result.cutSvg, 'cut.svg')} label="Download Cut SVG" /></PreviewPane>)}
          {result && previewTab === 'combined' && (<PreviewPane><div className="w-full max-w-2xl overflow-auto rounded-lg border border-slate-700 bg-white p-2 [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: result.combinedSvg }} /><div className="flex gap-2 mt-2"><DlBtn onClick={() => handleDownloadSvg(result.combinedSvg, 'combined.svg')} label="Download Combined SVG" /><DlBtn onClick={handleExportZip} label="Download ZIP Pack" /></div>{result.productionInfo && (<div className="mt-3 rounded-lg bg-slate-800/50 p-3 text-[10px] text-slate-400 space-y-1"><div className="text-[11px] font-semibold text-slate-300 mb-1">LightBurn Import Notes:</div>{result.productionInfo.lightburnNotes.map((note: string, i: number) => (<div key={i} className="flex items-start gap-1.5"><span className="text-sky-400 shrink-0">→</span><span>{note}</span></div>))}</div>)}</PreviewPane>)}
          {result && previewTab === 'score' && result.scoreSvg && (<PreviewPane><div className="w-full max-w-2xl overflow-auto rounded-lg border border-blue-700/30 bg-white p-4 [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: result.scoreSvg }} /><p className="mt-2 text-[10px] text-slate-500">Score layer (blue) — low power decorative lines. Import separately in LightBurn.</p><DlBtn onClick={() => handleDownloadSvg(result.scoreSvg!, 'score.svg')} label="Download Score SVG" /></PreviewPane>)}
          {result && previewTab === 'silhouette' && result.contourExtraction?.silhouettePng && (<PreviewPane><img src={`data:image/jpeg;base64,${result.contourExtraction.silhouettePng}`} alt="Silhouette" className="w-full max-w-2xl rounded-lg shadow-2xl object-contain bg-white p-4" /><p className="mt-2 text-[10px] text-slate-500">AI-extracted silhouette used for contour generation ({result.contourExtraction.pointCount} vector points)</p></PreviewPane>)}
          {result && previewTab === 'optimized-cut' && result.optimizedCutSvg && (<PreviewPane><div className="w-full max-w-2xl overflow-auto rounded-lg border border-slate-700 bg-white p-2 [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: result.optimizedCutSvg }} />{result.cutPathOptimization && (<div className="mt-2 flex gap-3 text-[10px] text-slate-400"><span className="text-emerald-400">Saved {result.cutPathOptimization.savedTravelMm}mm</span><span className="text-emerald-400">{result.cutPathOptimization.savedTimeSec}s</span></div>)}<DlBtn onClick={() => handleDownloadSvg(result.optimizedCutSvg!, 'optimized-cut.svg')} label="Download Opt. Cut SVG" /></PreviewPane>)}
          {result && previewTab === 'simulation' && (<PreviewPane><div className="relative w-full max-w-2xl"><div className="rounded-xl p-4 shadow-2xl" style={{ backgroundColor: mat.color }}><img src={`data:image/jpeg;base64,${result.laserSimulation?.simulationPng || result.engravePreviewPng}`} alt="Simulation" className="w-full rounded-lg object-contain mix-blend-multiply" style={{ filter: `contrast(${mat.engravingContrastCurve}) sepia(0.3) saturate(0.7)`, opacity: 0.85 }} />{result.laserSimulation && result.laserSimulation.smokeStainIntensity > 0.3 && (<div className="pointer-events-none absolute inset-4 rounded-lg" style={{ boxShadow: `inset 0 0 ${result.laserSimulation.smokeStainIntensity * 20}px rgba(80,50,20,${result.laserSimulation.smokeStainIntensity * 0.4})` }} />)}{result.laserSimulation && result.laserSimulation.acrylicFrostLevel > 0.3 && (<div className="pointer-events-none absolute inset-4 rounded-lg" style={{ background: `rgba(255,255,255,${result.laserSimulation.acrylicFrostLevel * 0.15})`, backdropFilter: `blur(${result.laserSimulation.acrylicFrostLevel}px)` }} />)}</div><div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-800 px-3 py-1 text-[10px] font-medium text-slate-400 shadow">{mat.label} — {mach.label} — Quality: {result.laserSimulation?.qualityScore ?? '—'}/100</div></div>{result.laserSimulation && (<div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6"><SimMetric label="Kerf" value={`${result.laserSimulation.kerfWidthAtSpeed}mm`} color="sky" /><SimMetric label="Depth" value={`${result.laserSimulation.depthEstimateMm}mm`} color="amber" /><SimMetric label="Heat" value={`${result.laserSimulation.heatAccumulationZones}`} color="red" /><SimMetric label="Smoke" value={`${Math.round(result.laserSimulation.smokeStainIntensity * 100)}%`} color="orange" /><SimMetric label="Frost" value={`${Math.round(result.laserSimulation.acrylicFrostLevel * 100)}%`} color="cyan" /><SimMetric label="Quality" value={`${result.laserSimulation.qualityScore}/100`} color="emerald" /></div>)}</PreviewPane>)}
          {result && previewTab === 'structural' && result.structuralAnalysis && (<PreviewPane><div className="w-full max-w-2xl"><div className="mb-4 flex items-center justify-center gap-4"><ScoreGauge score={result.structuralAnalysis.strengthScore} label="Strength" /></div><div className="overflow-auto rounded-lg border border-slate-700 bg-white p-2 [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: result.structuralAnalysis.overlaySvg }} /><div className="mt-3 grid grid-cols-4 gap-2"><MetricCard label="Bridges" value={result.structuralAnalysis.fragileBridges} warn={result.structuralAnalysis.fragileBridges > 0} /><MetricCard label="Thin" value={result.structuralAnalysis.thinParts} warn={result.structuralAnalysis.thinParts > 0} /><MetricCard label="Stress" value={result.structuralAnalysis.stressPoints} warn={result.structuralAnalysis.stressPoints > 2} /><MetricCard label="Break" value={result.structuralAnalysis.breakZones} warn={result.structuralAnalysis.breakZones > 0} /></div><div className="mt-3 space-y-1">{result.structuralAnalysis.warnings.map((w, i) => (<WarningRow key={i} severity={w.severity} message={w.message} confidence={w.confidence} />))}</div></div></PreviewPane>)}
          {result && previewTab === 'multilayer' && result.multilayer && (<PreviewPane><div className="flex gap-2 mb-2">{result.multilayer.layers.map((l, i) => (<button key={i} onClick={() => setSelectedLayer(i)} className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${selectedLayer === i ? 'border-sky-500/70 bg-sky-500/10 text-sky-300' : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}><span className="inline-block h-2 w-2 rounded-full mr-1" style={{ backgroundColor: l.suggestedColor }} />{l.label} ({l.depthPercent}%)</button>))}</div><div className="w-full max-w-2xl overflow-auto rounded-lg border border-slate-700 bg-white p-2 [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: result.multilayer.layers[selectedLayer]?.svg || '' }} /><DlBtn onClick={() => { const l = result.multilayer!.layers[selectedLayer]; if (l) handleDownloadSvg(l.svg, `layer-${l.index + 1}.svg`); }} label="Download Layer SVG" /></PreviewPane>)}
          {result && previewTab === 'mockups' && result.mockups && result.mockups.length > 0 && (<PreviewPane><div className="flex gap-2 mb-2 flex-wrap">{result.mockups.map((m, i) => (<button key={i} onClick={() => setSelectedMockup(i)} className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${selectedMockup === i ? 'border-sky-500/70 bg-sky-500/10 text-sky-300' : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}>{MOCKUP_SCENES[m.scene as keyof typeof MOCKUP_SCENES]?.icon} {m.label}</button>))}</div><div className="relative w-full max-w-2xl"><div className="rounded-xl bg-gradient-to-br from-amber-900/40 via-amber-800/30 to-amber-900/40 p-6 shadow-2xl"><img src={`data:image/jpeg;base64,${result.mockups[selectedMockup]?.png}`} alt="Mockup" className="w-full rounded-lg object-contain" style={options.invertEngraving ? { filter: 'invert(1)' } : undefined} /></div></div></PreviewPane>)}
          {result && previewTab === 'batch-layout' && result.productionBatch && (<PreviewPane><div className="w-full max-w-2xl"><div className="overflow-auto rounded-lg border border-slate-700 bg-white p-2 [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: result.productionBatch.sheetLayoutSvg }} /><div className="mt-3 grid grid-cols-3 gap-2"><SimMetric label="Items" value={`${result.productionBatch.items.length}`} color="sky" /><SimMetric label="Usage" value={`${result.productionBatch.sheetUsagePercent}%`} color="emerald" /><SimMetric label="Time" value={`${Math.ceil(result.productionBatch.totalTimeSec / 60)}min`} color="amber" /></div><div className="mt-3 flex justify-between rounded-lg bg-emerald-900/20 px-3 py-2 text-xs"><span className="text-emerald-300 font-medium">Revenue</span><span className="text-emerald-400 font-bold">${result.productionBatch.totalSuggestedRevenue.toFixed(2)}</span></div></div></PreviewPane>)}
          {result && previewTab === 'refinement' && result.refinement && (<PreviewPane><div className="w-full max-w-2xl"><img src={`data:image/jpeg;base64,${result.refinement.refinedPreviewPng}`} alt="Refined" className="w-full rounded-lg shadow-2xl object-contain" /><div className="mt-4 grid grid-cols-3 gap-2"><ScoreGauge score={result.refinement.clarityScore} label="Clarity" small /><ScoreGauge score={result.refinement.contrastScore} label="Contrast" small /><ScoreGauge score={result.refinement.noiseReduction} label="Noise" small /></div><div className="mt-3 space-y-1">{result.refinement.improvements.map((imp, i) => (<div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2 text-[11px] ${imp.impact === 'high' ? 'bg-amber-900/20' : imp.impact === 'medium' ? 'bg-sky-900/10' : 'bg-slate-800/30'}`}><span className="text-slate-300"><strong>{imp.area}:</strong> {imp.description}</span><span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${imp.impact === 'high' ? 'bg-amber-900/40 text-amber-300' : imp.impact === 'medium' ? 'bg-sky-900/40 text-sky-300' : 'bg-slate-800 text-slate-400'}`}>{imp.impact}</span></div>))}</div></div></PreviewPane>)}
        </div>

        {/* BOTTOM PANELS */}
        {result && (<BottomPanels result={result} bottomPanel={bottomPanel} setBottomPanel={setBottomPanel} options={options} selectedProduct={selectedProduct} handleDownloadSvg={handleDownloadSvg} handleExportZip={handleExportZip} />)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  EXTRACTED PANEL COMPONENTS                                        */
/* ═══════════════════════════════════════════════════════════════════ */

function V3Header({ result }: { result: GenerateResponse | null }) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-800/80 to-slate-900 p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-violet-500"><Zap className="h-4 w-4 text-white" /></div>
        <div><h2 className="text-base font-bold text-slate-100">Photo → Laser Product</h2><p className="text-[10px] text-slate-500">V4 — Real Product Generation Pipeline</p></div>
      </div>
      {result?.pipelineJob && (<div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500"><CheckCircle className="h-3 w-3 text-emerald-400" /><span>Pipeline complete — {result.pipelineJob.completedSteps.length} steps | Subject → Contour → Template → SVG</span></div>)}
    </div>
  );
}

function UploadZone({ isDragging, uploadedImage, uploadedFileName, fileInputRef, handleDrop, handleDragOver, handleDragLeave, handleFileInput }: any) {
  return (
    <div onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={() => fileInputRef.current?.click()}
      className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition-all ${isDragging ? 'border-sky-400 bg-sky-500/10 scale-[1.02]' : uploadedImage ? 'border-emerald-600/50 bg-emerald-900/10' : 'border-slate-700 bg-slate-900/40 hover:border-slate-500'}`}>
      <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleFileInput} className="hidden" />
      {uploadedImage ? (<div className="space-y-2"><img src={uploadedImage} alt="Preview" className="mx-auto max-h-24 rounded-lg object-contain shadow-lg" /><p className="text-xs font-medium text-emerald-400">{uploadedFileName}</p><p className="text-[10px] text-slate-500">Click or drop to replace</p></div>) : (<><Upload className="mb-2 h-7 w-7 text-slate-500" /><p className="text-sm font-medium text-slate-300">Drop photo or click to upload</p><p className="mt-1 text-[10px] text-slate-500">JPG, PNG, WEBP — max 15MB</p></>)}
    </div>
  );
}

function BatchToggle({ batchMode, setBatchMode, setBatchItems }: any) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2">
      <span className="text-[11px] text-slate-400">Batch Mode (Etsy sellers)</span>
      <div onClick={() => { setBatchMode(!batchMode); if (batchMode) setBatchItems([]); }} className={`relative h-5 w-9 cursor-pointer rounded-full transition-colors ${batchMode ? 'bg-fuchsia-500' : 'bg-slate-700'}`}>
        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${batchMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
    </div>
  );
}

function BatchPanel({ batchInputRef, batchItems, batchProcessing, handleBatchFiles, handleBatchGenerate, handleBatchExportAll }: any) {
  return (
    <div className="space-y-2">
      <input ref={batchInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" multiple onChange={(e: any) => { if (e.target.files) handleBatchFiles(e.target.files); }} className="hidden" />
      <button onClick={() => batchInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-fuchsia-700/50 bg-fuchsia-900/10 px-4 py-3 text-xs text-fuchsia-300 hover:border-fuchsia-600/50"><Upload className="h-4 w-4" /> Select Multiple Photos (max 10)</button>
      {batchItems.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] text-slate-500">{batchItems.length} images queued</div>
          {batchItems.map((it: BatchItem) => (<div key={it.id} className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-[10px] ${it.status === 'complete' ? 'bg-emerald-900/20 text-emerald-300' : it.status === 'error' ? 'bg-red-900/20 text-red-300' : it.status === 'processing' ? 'bg-sky-900/20 text-sky-300' : 'bg-slate-800/50 text-slate-400'}`}><span className="truncate max-w-[180px]">{it.fileName}</span><span className="shrink-0 ml-2">{it.status === 'complete' ? <CheckCircle className="h-3 w-3 text-emerald-400" /> : it.status === 'error' ? <XCircle className="h-3 w-3 text-red-400" /> : it.status === 'processing' ? <Activity className="h-3 w-3 animate-pulse text-sky-400" /> : <div className="h-3 w-3 rounded-full border border-slate-600" />}</span></div>))}
          <button onClick={handleBatchGenerate} disabled={batchProcessing} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-fuchsia-500 to-violet-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg disabled:opacity-50">{batchProcessing ? (<><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Processing...</>) : (<><Sparkles className="h-3.5 w-3.5" /> Generate All ({batchItems.length})</>)}</button>
          {batchItems.some((it: BatchItem) => it.status === 'complete') && (<button onClick={handleBatchExportAll} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700"><Download className="h-3.5 w-3.5" /> Export All ZIP</button>)}
        </div>
      )}
    </div>
  );
}

function LaserActionsPanel({ result, selectedProduct, options }: any) {
  const [machines, setMachines] = useState<any[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [sendingJob, setSendingJob] = useState(false);
  const [jobResult, setJobResult] = useState<any>(null);
  const [publishingListing, setPublishingListing] = useState(false);
  const [listingResult, setListingResult] = useState<any>(null);
  const [selectedPlatform, setSelectedPlatform] = useState('INTERNAL');
  const [machinesLoaded, setMachinesLoaded] = useState(false);

  const loadMachines = useCallback(async () => {
    if (machinesLoaded) return;
    try {
      const { apiClient } = await import('@/lib/api-client');
      const res = await apiClient.get('/laser-machines');
      setMachines(res.data || []);
      if (res.data?.length > 0) setSelectedMachine(res.data[0].id);
    } catch {} finally { setMachinesLoaded(true); }
  }, [machinesLoaded]);

  useEffect(() => { loadMachines(); }, [loadMachines]);

  const handleSendToLaser = async () => {
    if (!selectedMachine) return;
    setSendingJob(true);
    setJobResult(null);
    try {
      const { apiClient } = await import('@/lib/api-client');
      const meRes = await apiClient.get('/auth/me');
      const userId = meRes.data?.user?.id;
      const res = await apiClient.post('/laser-pipeline/product-to-job', {
        userId,
        machineId: selectedMachine,
        productType: selectedProduct,
        materialLabel: result.productionInsights?.materialLabel || options.material,
        thicknessMm: result.productionInsights?.thicknessMm,
        jobWidthMm: result.productionInsights?.widthMm,
        jobHeightMm: result.productionInsights?.heightMm,
        estimatedTimeSec: result.productionInsights ? (result.productionInsights.engraveTimeSec + result.productionInsights.cutTimeSec) : undefined,
        speedMmS: result.productionInsights?.machineAdjustedSpeed,
        powerPct: result.productionInsights?.adjustedPower,
      });
      setJobResult(res.data);
    } catch (err: any) {
      setJobResult({ error: err?.response?.data?.message || 'Failed to create job' });
    } finally { setSendingJob(false); }
  };

  const handlePublishProduct = async () => {
    setPublishingListing(true);
    setListingResult(null);
    try {
      const { apiClient } = await import('@/lib/api-client');
      const meRes = await apiClient.get('/auth/me');
      const userId = meRes.data?.user?.id;
      const wMm = result.productionInsights?.widthMm || 100;
      const hMm = result.productionInsights?.heightMm || 100;
      const res = await apiClient.post('/laser-pipeline/product-to-listing', {
        userId,
        platform: selectedPlatform,
        productType: selectedProduct,
        materialLabel: result.productionInsights?.materialLabel || options.material,
        sizeMm: `${wMm}x${hMm}`,
        subjectLabel: result.subjectDetection?.label,
        subjectType: result.subjectDetection?.type,
        costOfGoods: result.productionInsights?.materialCostEstimate,
      });
      setListingResult(res.data);
    } catch (err: any) {
      setListingResult({ error: err?.response?.data?.message || 'Failed to create listing' });
    } finally { setPublishingListing(false); }
  };

  return (
    <div className="space-y-4">
      {/* WIP Banner */}
      <div className="flex items-center gap-3 rounded-xl border border-amber-700/40 bg-amber-900/15 px-4 py-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
        <div>
          <p className="text-[11px] font-semibold text-amber-300">Work in Progress</p>
          <p className="text-[10px] text-amber-400/70">These features are under active development and are not yet functional or tested.</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
      {/* Send to Laser */}
      <div className="rounded-xl border border-orange-800/30 bg-orange-900/10 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-orange-300">
          <Zap className="h-4 w-4" /> Send to Laser Machine
        </h3>
        {machines.length === 0 ? (
          <div className="text-center py-4">
            <Monitor className="mx-auto h-8 w-8 text-slate-600 mb-2" />
            <p className="text-[11px] text-slate-500">No machines configured</p>
            <a href="/studio/production/machines" className="mt-2 inline-flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300">
              Add Machine →
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-slate-500">Select Machine</label>
              <select value={selectedMachine} onChange={e => setSelectedMachine(e.target.value)} className="mt-0.5 w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-orange-600 focus:outline-none">
                {machines.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.machineType || 'Manual'}) — {m.connectionStatus?.toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="rounded bg-slate-800/50 px-2 py-1"><span className="text-slate-500">Product:</span> <span className="text-slate-300">{selectedProduct}</span></div>
              <div className="rounded bg-slate-800/50 px-2 py-1"><span className="text-slate-500">Material:</span> <span className="text-slate-300">{result.productionInsights?.materialLabel || options.material}</span></div>
              <div className="rounded bg-slate-800/50 px-2 py-1"><span className="text-slate-500">Size:</span> <span className="text-slate-300">{result.productionInsights?.widthMm}×{result.productionInsights?.heightMm}mm</span></div>
              <div className="rounded bg-slate-800/50 px-2 py-1"><span className="text-slate-500">Time:</span> <span className="text-slate-300">~{result.productionInsights?.estimatedTimeMinutes}min</span></div>
            </div>
            <button onClick={handleSendToLaser} disabled={sendingJob || !selectedMachine} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-orange-500/20 hover:shadow-xl disabled:opacity-50 transition-all">
              {sendingJob ? <><Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Creating Job...</> : <><Send className="h-3.5 w-3.5" /> Send to Laser</>}
            </button>
            {jobResult && !jobResult.error && (
              <div className="rounded-lg border border-emerald-800/40 bg-emerald-900/20 p-2.5 text-[10px]">
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium mb-1"><CheckCircle className="h-3 w-3" /> Job Created</div>
                <div className="text-slate-400">Job &quot;{jobResult.job?.jobName}&quot; is ready. {jobResult.readyToSend ? 'Ready to send!' : 'Review warnings first.'}</div>
                <a href="/studio/production/jobs" className="mt-1 inline-flex items-center gap-1 text-sky-400 hover:text-sky-300">View Jobs →</a>
              </div>
            )}
            {jobResult?.error && (
              <div className="rounded-lg border border-red-800/40 bg-red-900/20 p-2.5 text-[10px] text-red-400">{jobResult.error}</div>
            )}
          </div>
        )}
      </div>

      {/* Publish Product */}
      <div className="rounded-xl border border-emerald-800/30 bg-emerald-900/10 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-emerald-300">
          <ShoppingBag className="h-4 w-4" /> Publish to Marketplace
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-500">Platform</label>
            <select value={selectedPlatform} onChange={e => setSelectedPlatform(e.target.value)} className="mt-0.5 w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-600 focus:outline-none">
              <option value="INTERNAL">Internal (Draft)</option>
              <option value="ETSY">Etsy</option>
              <option value="SHOPIFY">Shopify</option>
              <option value="WOOCOMMERCE">WooCommerce</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="rounded bg-slate-800/50 px-2 py-1"><span className="text-slate-500">Product:</span> <span className="text-slate-300">{selectedProduct}</span></div>
            <div className="rounded bg-slate-800/50 px-2 py-1"><span className="text-slate-500">Subject:</span> <span className="text-slate-300">{result.subjectDetection?.label || 'custom'}</span></div>
            <div className="rounded bg-slate-800/50 px-2 py-1"><span className="text-slate-500">Price:</span> <span className="text-emerald-400">${result.productionInsights?.recommendedPrice}</span></div>
            <div className="rounded bg-slate-800/50 px-2 py-1"><span className="text-slate-500">Margin:</span> <span className="text-emerald-400">{result.productionInsights?.profitMargin}%</span></div>
          </div>
          <button onClick={handlePublishProduct} disabled={publishingListing} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl disabled:opacity-50 transition-all">
            {publishingListing ? <><Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Creating Listing...</> : <><Globe className="h-3.5 w-3.5" /> Create Listing</>}
          </button>
          {listingResult && !listingResult.error && (
            <div className="rounded-lg border border-emerald-800/40 bg-emerald-900/20 p-2.5 text-[10px]">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium mb-1"><CheckCircle className="h-3 w-3" /> Listing Created</div>
              <div className="text-slate-400">&quot;{listingResult.listing?.title?.slice(0, 60)}...&quot;</div>
              <div className="text-slate-500 mt-0.5">SKU: {listingResult.listing?.sku} — ${Number(listingResult.listing?.price || 0).toFixed(2)}</div>
              <a href="/studio/production/marketplace" className="mt-1 inline-flex items-center gap-1 text-sky-400 hover:text-sky-300">View Listings →</a>
            </div>
          )}
          {listingResult?.error && (
            <div className="rounded-lg border border-red-800/40 bg-red-900/20 p-2.5 text-[10px] text-red-400">{listingResult.error}</div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

function BottomPanels({ result, bottomPanel, setBottomPanel, options, selectedProduct, handleDownloadSvg, handleExportZip }: any) {
  return (
    <div className="mt-4">
      <div className="mb-3 flex gap-1 overflow-x-auto">
        {([
          { key: 'intelligence', label: 'Production', icon: Activity },
          { key: 'laser', label: 'Laser', icon: Zap },
          { key: 'coach', label: 'AI Coach', icon: Lightbulb },
          { key: 'batch', label: 'Batch', icon: Factory },
          { key: 'market', label: 'Market', icon: ShoppingBag },
          { key: 'export', label: 'Export', icon: Package },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setBottomPanel(key)} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${bottomPanel === key ? 'bg-slate-800 text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}><Icon className="h-3 w-3" />{label}</button>
        ))}
      </div>

      {bottomPanel === 'intelligence' && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <IntelCard title="Production Time" icon={<Clock className="h-3.5 w-3.5 text-amber-400" />}>
            <div className="text-2xl font-bold text-slate-100">~{result.productionInsights.estimatedTimeMinutes} min</div>
            <div className="mt-1 text-[10px] text-slate-500">{result.productionInsights.machineLabel} — {result.productionInsights.confidenceScore}%</div>
            <div className="mt-2 space-y-1 text-[10px]">
              <div className="flex justify-between"><span className="text-slate-500">Engrave</span><span className="text-slate-300">{result.productionInsights.engraveTimeSec}s</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Cut</span><span className="text-slate-300">{result.productionInsights.cutTimeSec}s</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Adj Speed</span><span className="text-cyan-400">{result.productionInsights.machineAdjustedSpeed}mm/s</span></div>
            </div>
          </IntelCard>
          <IntelCard title="Risk Alerts" icon={<AlertTriangle className="h-3.5 w-3.5 text-orange-400" />}>
            <div className="space-y-1">{result.riskWarnings.slice(0, 4).map((w: any, i: number) => (<WarningRow key={i} severity={w.severity} message={w.message} confidence={w.confidence} compact />))}</div>
          </IntelCard>
          {result.structuralAnalysis && (<IntelCard title="Structural" icon={<Shield className="h-3.5 w-3.5 text-sky-400" />}><ScoreGauge score={result.structuralAnalysis.strengthScore} label="Strength" small /></IntelCard>)}
          {result.cutPathOptimization && (<IntelCard title="Cut Order" icon={<Scissors className="h-3.5 w-3.5 text-emerald-400" />}><div className="space-y-1 text-[10px]"><div className="flex justify-between"><span className="text-slate-500">Strategy</span><span className="text-emerald-300 font-medium">{result.cutPathOptimization.strategy}</span></div><div className="flex justify-between"><span className="text-slate-500">Segments</span><span className="text-slate-300">{result.cutPathOptimization.segmentCount}</span></div><div className="flex justify-between"><span className="text-slate-500">Travel saved</span><span className="text-emerald-400">{result.cutPathOptimization.savedTravelMm}mm</span></div><div className="flex justify-between"><span className="text-slate-500">Time saved</span><span className="text-emerald-400">{result.cutPathOptimization.savedTimeSec}s</span></div></div></IntelCard>)}
          {result.wasteAnalysis && (<IntelCard title="Efficiency" icon={<Recycle className="h-3.5 w-3.5 text-emerald-400" />}><div className="text-2xl font-bold text-emerald-400">{result.wasteAnalysis.usagePercent}%</div><div className="mt-1 text-[10px] text-slate-500">of {result.wasteAnalysis.sheetSizeMm[0]}x{result.wasteAnalysis.sheetSizeMm[1]}mm</div></IntelCard>)}
          {result.fileValidation && (<IntelCard title="Validation" icon={<FileCheck className="h-3.5 w-3.5 text-sky-400" />}><div className="flex items-center gap-2">{result.fileValidation.isValid ? <CheckCircle className="h-5 w-5 text-emerald-400" /> : <XCircle className="h-5 w-5 text-red-400" />}<span className={`text-lg font-bold ${result.fileValidation.isValid ? 'text-emerald-400' : 'text-red-400'}`}>{result.fileValidation.score}/100</span></div></IntelCard>)}
          <IntelCard title="Cost & Pricing" icon={<DollarSign className="h-3.5 w-3.5 text-emerald-400" />}>
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between"><span className="text-slate-500">Material</span><span className="text-slate-300">${result.productionInsights.materialCostEstimate}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Price</span><span className="text-emerald-400 font-semibold">${result.productionInsights.recommendedPrice}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Margin</span><span className="text-emerald-400">{result.productionInsights.profitMargin}%</span></div>
            </div>
          </IntelCard>
          {result.laserSimulation && (<IntelCard title="Simulation" icon={<Gauge className="h-3.5 w-3.5 text-orange-400" />}><ScoreGauge score={result.laserSimulation.qualityScore} label="Quality" small /></IntelCard>)}
        </div>
      )}

      {bottomPanel === 'laser' && (
        <LaserActionsPanel result={result} selectedProduct={selectedProduct} options={options} />
      )}

      {bottomPanel === 'coach' && (
        <div className="space-y-3">
          {result.designCoachTips && result.designCoachTips.length > 0 ? (
            <div className="grid gap-2 md:grid-cols-2">{result.designCoachTips.map((tip: any, i: number) => (
              <div key={i} className={`rounded-xl border p-3 ${tip.impact === 'high' ? 'border-amber-700/40 bg-amber-900/10' : tip.impact === 'medium' ? 'border-sky-700/40 bg-sky-900/10' : 'border-slate-700/40 bg-slate-800/30'}`}>
                <div className="flex items-center justify-between"><div className="flex items-center gap-2"><CategoryBadge category={tip.category} /><span className="text-xs font-semibold text-slate-200">{tip.title}</span></div><span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${tip.impact === 'high' ? 'bg-amber-900/40 text-amber-300' : tip.impact === 'medium' ? 'bg-sky-900/40 text-sky-300' : 'bg-slate-800 text-slate-400'}`}>{tip.impact}</span></div>
                <p className="mt-1.5 text-[11px] text-slate-400">{tip.suggestion}</p>
              </div>
            ))}</div>
          ) : (<div className="rounded-xl border border-slate-700 bg-slate-900/40 p-6 text-center"><Lightbulb className="mx-auto mb-2 h-6 w-6 text-slate-600" /><p className="text-xs text-slate-500">Enable Design AI Coach</p></div>)}
          {result.styleProfile && (<div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4"><h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-200"><Palette className="h-4 w-4 text-violet-400" /> Style Profile</h3><div className="grid grid-cols-5 gap-2"><SimMetric label="Tone" value={`${result.styleProfile.engravingTone}%`} color="amber" /><SimMetric label="Line" value={`${result.styleProfile.lineThickness}mm`} color="sky" /><SimMetric label="Language" value={result.styleProfile.designLanguage} color="emerald" /><SimMetric label="BG" value={result.styleProfile.backgroundStyle} color="cyan" /><SimMetric label="Contrast" value={`${result.styleProfile.contrastLevel}%`} color="orange" /></div></div>)}
          {result.variants && result.variants.length > 0 && (<div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4"><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200"><LayoutGrid className="h-4 w-4 text-violet-400" /> Variants</h3><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{result.variants.map((v: any) => (<div key={v.productType} className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-2 text-center"><img src={`data:image/jpeg;base64,${v.previewPng}`} alt={v.label} className="mx-auto mb-1.5 h-14 w-14 rounded object-contain" /><p className="text-[11px] font-medium text-slate-200">{v.icon} {v.label}</p><p className="text-[9px] text-slate-500">{v.sizeMm[0]}x{v.sizeMm[1]}mm</p><button onClick={() => handleDownloadSvg(v.engraveSvg, `${v.productType}-engrave.svg`)} className="mt-1.5 flex w-full items-center justify-center gap-1 rounded bg-slate-700/50 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-600/50"><Download className="h-2.5 w-2.5" /> SVG</button></div>))}</div></div>)}
        </div>
      )}

      {bottomPanel === 'batch' && (
        <div className="space-y-3">
          {result.productionBatch ? (
            <div className="grid gap-3 md:grid-cols-3">
              <IntelCard title="Batch Summary" icon={<Factory className="h-3.5 w-3.5 text-cyan-400" />}>
                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between"><span className="text-slate-500">Items</span><span className="text-slate-300">{result.productionBatch.items.length}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Time</span><span className="text-amber-400">{Math.ceil(result.productionBatch.totalTimeSec / 60)} min</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Cost</span><span className="text-slate-300">${result.productionBatch.totalMaterialCost}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Revenue</span><span className="text-emerald-400 font-bold">${result.productionBatch.totalSuggestedRevenue}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Usage</span><span className="text-emerald-400">{result.productionBatch.sheetUsagePercent}%</span></div>
                </div>
              </IntelCard>
              <div className="md:col-span-2 rounded-xl border border-slate-700/50 bg-slate-900/40 p-3">
                <h4 className="mb-2 text-[11px] font-semibold text-slate-300">Items</h4>
                <div className="space-y-1">{result.productionBatch.items.map((item: any, i: number) => (<div key={i} className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-1.5 text-[10px]"><span className="text-slate-300 font-medium">{item.label}</span><div className="flex gap-3"><span className="text-slate-500">{item.sizeMm[0]}x{item.sizeMm[1]}mm</span><span className="text-emerald-400">${item.suggestedPrice.toFixed(2)}</span></div></div>))}</div>
              </div>
            </div>
          ) : (<div className="rounded-xl border border-slate-700 bg-slate-900/40 p-6 text-center"><Factory className="mx-auto mb-2 h-6 w-6 text-slate-600" /><p className="text-xs text-slate-500">Enable Batch Builder</p></div>)}
        </div>
      )}

      {bottomPanel === 'market' && (
        <div className="space-y-3">
          {result.marketPack ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
                <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-200"><ShoppingBag className="h-3.5 w-3.5 text-emerald-400" /> Product Listing</h3>
                <div className="text-sm font-bold text-slate-100">{result.marketPack.productTitle}</div>
                <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">{result.marketPack.productDescription}</p>
                <div className="mt-3 flex flex-wrap gap-1">{result.marketPack.tags.map((tag: string, i: number) => (<span key={i} className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] text-slate-400">{tag}</span>))}</div>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-200"><TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> Pricing</h3>
                  <div className="space-y-1">{result.marketPack.pricingTiers.map((tier: any, i: number) => (<div key={i} className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2 text-[10px]"><span className="text-slate-300 font-medium">{tier.label}</span><div className="flex gap-3"><span className="text-emerald-400 font-bold">${tier.unitPrice}</span><span className="text-slate-500">{tier.profitMargin}%</span></div></div>))}</div>
                </div>
                <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-200"><Ruler className="h-3.5 w-3.5 text-sky-400" /> Sizes</h3>
                  <div className="space-y-1">{result.marketPack.sizeVariations.map((sv: any, i: number) => (<div key={i} className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-1.5 text-[10px]"><span className="text-slate-300">{sv.label}</span><span className="text-slate-500">{sv.sizeMm[0]}x{sv.sizeMm[1]}mm</span><span className="text-sky-400">{sv.priceMultiplier}x</span></div>))}</div>
                </div>
              </div>
            </div>
          ) : (<div className="rounded-xl border border-slate-700 bg-slate-900/40 p-6 text-center"><ShoppingBag className="mx-auto mb-2 h-6 w-6 text-slate-600" /><p className="text-xs text-slate-500">Enable Market-Ready Pack</p></div>)}
        </div>
      )}

      {bottomPanel === 'export' && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-200"><Package className="h-3.5 w-3.5 text-sky-400" /> Export Laser Product Pack</h3>
            <p className="mb-3 text-[10px] text-slate-400">Production-ready ZIP with layered SVGs (Cut/Engrave/Score), preview, and production info. Ready for LightBurn import.</p>
            <button onClick={handleExportZip} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl"><Download className="h-4 w-4" /> Download Product Pack (.zip)</button>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
            <h3 className="mb-3 text-xs font-semibold text-slate-200">ZIP Contents</h3>
            <div className="space-y-1">
              <ExportFileRow name="cut.svg" desc="Cut layer (red) — full power" />
              <ExportFileRow name="engrave.svg" desc="Engrave layer (black) — raster" />
              {result.scoreSvg && <ExportFileRow name="score.svg" desc="Score layer (blue) — decorative" />}
              <ExportFileRow name="combined.svg" desc="All layers merged" />
              <ExportFileRow name="preview.png" desc="Engraving preview" />
              <ExportFileRow name="production-info.json" desc="Full production metadata" />
              {result.contourExtraction?.silhouettePng && <ExportFileRow name="silhouette.png" desc="AI-extracted silhouette" />}
              <ExportFileRow name="README.txt" desc="LightBurn import guide" />
              {result.mockups?.length > 0 && <ExportFileRow name="mockups/" desc="Scene mockup PNGs" />}
              {result.variants?.length > 0 && <ExportFileRow name="variants/" desc="Variant SVGs" />}
              {result.multilayer && <ExportFileRow name="multilayer/" desc="Layer SVGs" />}
              <ExportFileRow name="reports/" desc="Risk, simulation, structural" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
