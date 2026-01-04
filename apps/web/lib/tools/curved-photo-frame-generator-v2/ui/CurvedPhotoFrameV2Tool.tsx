'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Lock, Sparkles, Image as ImageIcon, Settings, Download, ZoomIn, ZoomOut, Box, RotateCcw } from 'lucide-react';
import dynamic from 'next/dynamic';
import { downloadTextFile } from '@/lib/studio/export/download';
import { downloadZip } from '@/lib/studio/export/zip';
import { exportCurvedPhotoFrameV2Dxf } from '../core/exportDxf';
import {
  processImagePipeline,
  imageDataToDataUrl,
  loadImageFromUrl,
  aiClient,
  type ImageAdjustments,
  DEFAULT_ADJUSTMENTS,
} from '@/lib/shared/image-pipeline';
import {
  type CurvedPhotoFrameV2Inputs,
  type PhotoSizePreset,
  type MaterialThickness,
  type CurveStrength,
  type StandType,
  type ViewingAngle,
  type WoodStylePreset,
  type DetailLevel,
  type FeatureFlags,
  PHOTO_SIZE_PRESETS,
  WOOD_STYLE_PRESETS,
  DEFAULT_AI_SETTINGS,
  DEFAULT_ENGRAVE_SETTINGS,
  DEFAULT_FRAME_SETTINGS,
} from '../types';
import { generateCurvedPhotoFrameV2 } from '../core/geometry';

// Dynamic import for 3D preview to avoid SSR issues
const CurvedPhotoFramePreview3D = dynamic(
  () => import('./CurvedPhotoFramePreview3D').then(mod => ({ default: mod.CurvedPhotoFramePreview3D })),
  { ssr: false }
);

export interface CurvedPhotoFrameV2ToolProps {
  onResetCallback?: (fn: () => void) => void;
  onExportCallback?: (fn: () => void) => void;
  featureFlags?: FeatureFlags;
}

export function CurvedPhotoFrameV2Tool({
  onResetCallback,
  onExportCallback,
  featureFlags = { isProUser: false },
}: CurvedPhotoFrameV2ToolProps) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);
  const [processedPhotoDataUrl, setProcessedPhotoDataUrl] = useState<string | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cropPreview, setCropPreview] = useState<string | undefined>(undefined);

  const [aiSettings, setAiSettings] = useState(DEFAULT_AI_SETTINGS);
  const [engraveSettings, setEngraveSettings] = useState(DEFAULT_ENGRAVE_SETTINGS);
  const [frameSettings, setFrameSettings] = useState(DEFAULT_FRAME_SETTINGS);

  const [activeTab, setActiveTab] = useState<'photo' | 'ai' | 'frame'>('frame');

  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const [previewMode, setPreviewMode] = useState<'2d' | '3d'>('2d');
  const [previewTarget, setPreviewTarget] = useState<'combined' | 'back' | 'stand'>('combined');
  const [zoom, setZoom] = useState(1);
  const [rotationYDeg, setRotationYDeg] = useState(18);
  const [tiltXDeg, setTiltXDeg] = useState(-18);

  const handlePhotoUpload = useCallback((file: File) => {
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhotoDataUrl(dataUrl);
      setProcessedPhotoDataUrl(undefined);
      setCropPreview(undefined);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAutoCrop = useCallback(async () => {
    if (!photoDataUrl) return;
    if (!featureFlags.isProUser) {
      alert('Auto-Crop is a PRO feature');
      return;
    }

    setIsProcessing(true);
    try {
      const aspectRatio = frameSettings.photoWidthMm / frameSettings.photoHeightMm;
      const result = await aiClient.autoCrop(photoDataUrl, aspectRatio);

      const img = await loadImageFromUrl(photoDataUrl);
      const canvas = document.createElement('canvas');
      const crop = result.crop;
      canvas.width = crop.width;
      canvas.height = crop.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      const tempImg = new Image();
      tempImg.src = photoDataUrl;
      await new Promise((resolve) => {
        tempImg.onload = resolve;
      });

      ctx.drawImage(tempImg, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
      const croppedDataUrl = canvas.toDataURL('image/png');
      setCropPreview(croppedDataUrl);
      setPhotoDataUrl(croppedDataUrl);
    } catch (error) {
      console.error('Auto-crop failed:', error);
      alert('Auto-crop failed. Using original image.');
    } finally {
      setIsProcessing(false);
    }
  }, [photoDataUrl, frameSettings.photoWidthMm, frameSettings.photoHeightMm, featureFlags.isProUser]);

  const handleProcessPhoto = useCallback(async () => {
    if (!photoDataUrl) return;

    setIsProcessing(true);
    try {
      let imageData = await loadImageFromUrl(photoDataUrl);

      if (aiSettings.removeBackground && featureFlags.isProUser) {
        try {
          const bgResult = await aiClient.removeBackground(photoDataUrl);
          imageData = bgResult.imageData;
        } catch (error) {
          console.warn('Background removal failed, continuing without it', error);
        }
      }

      const woodPreset = engraveSettings.woodStyle
        ? WOOD_STYLE_PRESETS.find((p) => p.id === engraveSettings.woodStyle)
        : null;

      const adjustments: ImageAdjustments = {
        ...DEFAULT_ADJUSTMENTS,
        grayscale: true,
        brightness: woodPreset?.settings.brightness ?? 0,
        contrast: engraveSettings.contrast,
        gamma: woodPreset?.settings.gamma ?? 1.0,
        sharpen: woodPreset?.settings.sharpen ?? 0,
        denoise: aiSettings.enhanceEdges ? 1 : 0,
      };

      const targetWidthPx = Math.round((frameSettings.photoWidthMm / 25.4) * 254);
      const targetHeightPx = Math.round((frameSettings.photoHeightMm / 25.4) * 254);

      const processed = processImagePipeline(
        imageData,
        adjustments,
        engraveSettings.ditherMode,
        targetWidthPx,
        targetHeightPx
      );

      const processedDataUrl = imageDataToDataUrl(processed);
      setProcessedPhotoDataUrl(processedDataUrl);
    } catch (error) {
      console.error('Photo processing failed:', error);
      alert('Photo processing failed. Check console for details.');
    } finally {
      setIsProcessing(false);
    }
  }, [
    photoDataUrl,
    aiSettings,
    engraveSettings,
    frameSettings.photoWidthMm,
    frameSettings.photoHeightMm,
    featureFlags.isProUser,
  ]);

  const applyWoodPreset = useCallback((presetId: WoodStylePreset) => {
    const preset = WOOD_STYLE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setEngraveSettings((prev) => ({
      ...prev,
      woodStyle: presetId,
      contrast: preset.settings.contrast ?? prev.contrast,
      ditherMode: preset.settings.ditherMode,
      detailLevel: preset.settings.detailLevel,
    }));
  }, []);

  const handlePhotoSizePresetChange = useCallback((preset: PhotoSizePreset) => {
    setFrameSettings((prev) => {
      const config = PHOTO_SIZE_PRESETS[preset];
      if (!config) return { ...prev, photoSizePreset: preset };
      return {
        ...prev,
        photoSizePreset: preset,
        photoWidthMm: config.widthMm,
        photoHeightMm: config.heightMm,
      };
    });
  }, []);

  const inputs: CurvedPhotoFrameV2Inputs = useMemo(
    () => ({
      photoDataUrl,
      processedPhotoDataUrl,
      aiSettings,
      engraveSettings,
      frameSettings,
    }),
    [photoDataUrl, processedPhotoDataUrl, aiSettings, engraveSettings, frameSettings]
  );

  const result = useMemo(() => generateCurvedPhotoFrameV2(inputs), [inputs]);

  const sanitizeSvgForInline = useCallback((svg: string): string => {
    try {
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
      const el = doc.querySelector('svg');
      if (!el) return svg;
      el.removeAttribute('width');
      el.removeAttribute('height');
      if (!el.getAttribute('preserveAspectRatio')) el.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      return new XMLSerializer().serializeToString(el);
    } catch {
      return svg;
    }
  }, []);

  const getSvgViewBoxDims = useCallback((svg: string): { w: number; h: number } | null => {
    try {
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
      const el = doc.querySelector('svg');
      const vb = el?.getAttribute('viewBox');
      if (!vb) return null;
      const parts = vb
        .trim()
        .split(/[\s,]+/)
        .map((p) => Number(p))
        .filter((n) => Number.isFinite(n));
      if (parts.length !== 4) return null;
      const w = parts[2];
      const h = parts[3];
      if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
      return { w, h };
    } catch {
      return null;
    }
  }, []);
  const previewFrontPlateSvg = useMemo(
    () => sanitizeSvgForInline(result.svgs.front),
    [result.svgs.front, sanitizeSvgForInline]
  );
  const previewLeftSupportSvg = useMemo(
    () => sanitizeSvgForInline(result.svgs.back),
    [result.svgs.back, sanitizeSvgForInline]
  );
  const previewRightSupportSvg = useMemo(
    () => sanitizeSvgForInline(result.svgs.stand),
    [result.svgs.stand, sanitizeSvgForInline]
  );

  const previewSvg = useMemo(() => {
    if (previewTarget === 'back') return previewFrontPlateSvg; // "Front Plate" option
    if (previewTarget === 'stand') return previewLeftSupportSvg; // "Side Supports" option (shows left)
    return sanitizeSvgForInline(result.svgs.combined);
  }, [previewFrontPlateSvg, previewLeftSupportSvg, previewTarget, result.svgs.combined, sanitizeSvgForInline]);

  const combinedDims = useMemo(() => getSvgViewBoxDims(result.svgs.combined), [getSvgViewBoxDims, result.svgs.combined]);

  const outerDimsMm = useMemo(() => {
    const photoW = frameSettings.photoWidthMm;
    const photoH = frameSettings.photoHeightMm;
    const border = frameSettings.borderMm;
    return {
      w: Math.max(1, photoW + border * 2),
      h: Math.max(1, photoH + border * 2),
    };
  }, [frameSettings.borderMm, frameSettings.photoHeightMm, frameSettings.photoWidthMm]);

  const standDimsMm = useMemo(() => {
    return {
      w: Math.max(1, frameSettings.standWidthMm),
      h: Math.max(1, frameSettings.standDepthMm),
    };
  }, [frameSettings.standDepthMm, frameSettings.standWidthMm]);

  const arcAngleDeg = useMemo(() => {
    if (frameSettings.curveStrength === 'strong') return 55;
    if (frameSettings.curveStrength === 'medium') return 38;
    return 24;
  }, [frameSettings.curveStrength]);

  const svgToDataUrl = useCallback((svg: string) => {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }, []);

  const frontPlateSvgUrl = useMemo(() => svgToDataUrl(previewFrontPlateSvg), [previewFrontPlateSvg, svgToDataUrl]);
  const leftSupportSvgUrl = useMemo(() => svgToDataUrl(previewLeftSupportSvg), [previewLeftSupportSvg, svgToDataUrl]);
  const rightSupportSvgUrl = useMemo(() => svgToDataUrl(previewRightSupportSvg), [previewRightSupportSvg, svgToDataUrl]);

  const clampZoom = useCallback((z: number) => Math.max(0.25, Math.min(4, z)), []);

  const zoomIn = useCallback(() => setZoom((z) => clampZoom(z * 1.15)), [clampZoom]);
  const zoomOut = useCallback(() => setZoom((z) => clampZoom(z / 1.15)), [clampZoom]);

  const fitToView = useCallback(() => {
    const el = previewContainerRef.current;
    if (!el || !combinedDims) return;

    const padding = 16;
    const w = Math.max(1, el.clientWidth - padding);
    const h = Math.max(1, el.clientHeight - padding);

    const next = Math.min(w / combinedDims.w, h / combinedDims.h);
    setZoom(clampZoom(next));
  }, [clampZoom, combinedDims]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((z) => clampZoom(z * delta));
    },
    [clampZoom]
  );

  const exportSvgZip = useCallback(async () => {
    if (!featureFlags.isProUser) {
      alert('ZIP export is a PRO feature');
      return;
    }
    await downloadZip('curved-photo-frame-v2.zip', [
      { name: 'front-plate.svg', content: result.svgs.front },
      { name: 'side-support-left.svg', content: result.svgs.back },
      { name: 'side-support-right.svg', content: result.svgs.stand },
      { name: 'layout-combined.svg', content: result.svgs.combined },
    ]);
  }, [result.svgs, featureFlags.isProUser]);

  const exportSingleSvg = useCallback(() => {
    downloadTextFile('curved-photo-frame-v2.svg', result.svgs.combined, 'image/svg+xml');
  }, [result.svgs.combined]);

  const exportDxf = useCallback(() => {
    if (!featureFlags.isProUser) {
      alert('DXF export is a PRO feature');
      return;
    }
    try {
      const dxfContent = exportCurvedPhotoFrameV2Dxf(result.svgs.combined);
      downloadTextFile('curved-photo-frame-v2.dxf', dxfContent, 'application/dxf');
    } catch (error) {
      console.error('DXF export failed:', error);
      alert('DXF export failed. Check console for details.');
    }
  }, [result.svgs.combined, featureFlags.isProUser]);

  const exportPdf = useCallback(() => {
    if (!featureFlags.isProUser) {
      alert('PDF export is a PRO feature');
      return;
    }
    const w = window.open('', '_blank');
    if (!w) return;
    const html = `
      <!doctype html>
      <html>
      <head>
        <title>Curved Photo Frame V2</title>
        <style>
          @page { margin: 12mm; }
          body { margin: 0; padding: 12px; font-family: Arial, sans-serif; }
          .header { font-size: 12px; margin-bottom: 8px; color: #666; }
          .svg-container { text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">Curved Photo Frame V2 - Generated on ${new Date().toLocaleDateString()}</div>
        <div class="svg-container">${result.svgs.combined}</div>
      </body>
      </html>
    `;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }, [result.svgs.combined, featureFlags.isProUser]);

  const reset = useCallback(() => {
    setPhotoFile(null);
    setPhotoDataUrl(undefined);
    setProcessedPhotoDataUrl(undefined);
    setCropPreview(undefined);
    setAiSettings(DEFAULT_AI_SETTINGS);
    setEngraveSettings(DEFAULT_ENGRAVE_SETTINGS);
    setFrameSettings(DEFAULT_FRAME_SETTINGS);
    setActiveTab('frame');
  }, []);

  useEffect(() => {
    onResetCallback?.(reset);
  }, [onResetCallback, reset]);

  useEffect(() => {
    onExportCallback?.(exportSvgZip);
  }, [onExportCallback, exportSvgZip]);

  return (
    <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="flex gap-2 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('frame')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'frame'
                ? 'border-b-2 border-sky-500 text-sky-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <Settings className="inline w-4 h-4 mr-2" />
            Frame
          </button>
          <button
            onClick={() => setActiveTab('photo')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'photo'
                ? 'border-b-2 border-sky-500 text-sky-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <ImageIcon className="inline w-4 h-4 mr-2" />
            Photo
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'ai'
                ? 'border-b-2 border-sky-500 text-sky-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <Sparkles className="inline w-4 h-4 mr-2" />
            AI Prep
          </button>
        </div>

        {activeTab === 'photo' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-sm font-medium text-slate-100 mb-3">Upload Photo</div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:text-slate-200 hover:file:bg-slate-700"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePhotoUpload(f);
                }}
              />
              {photoFile && (
                <div className="mt-2 text-xs text-slate-400">
                  {photoFile.name} ({Math.round(photoFile.size / 1024)}KB)
                </div>
              )}
            </div>

            {photoDataUrl && (
              <>
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="text-sm font-medium text-slate-100 mb-3">Crop & Adjust</div>
                  <button
                    onClick={handleAutoCrop}
                    disabled={isProcessing || !featureFlags.isProUser}
                    className="w-full rounded-md bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {!featureFlags.isProUser && <Lock className="w-4 h-4" />}
                    <Sparkles className="w-4 h-4" />
                    {isProcessing ? 'Processing...' : 'Auto-Crop (Smart)'}
                  </button>
                  {!featureFlags.isProUser && (
                    <div className="mt-2 text-xs text-amber-400">PRO feature: Face/subject aware cropping</div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="text-sm font-medium text-slate-100 mb-3">Preview</div>
                  <div className="aspect-[3/4] bg-slate-900 rounded-lg overflow-hidden">
                    <img
                      src={cropPreview || photoDataUrl}
                      alt="Photo preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-sm font-medium text-slate-100 mb-3">Wood Style Presets</div>
              <div className="grid grid-cols-2 gap-2">
                {WOOD_STYLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyWoodPreset(preset.id)}
                    disabled={!featureFlags.isProUser}
                    className={`p-3 rounded-lg text-left text-sm transition-colors ${
                      engraveSettings.woodStyle === preset.id
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    } ${!featureFlags.isProUser ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {!featureFlags.isProUser && <Lock className="w-3 h-3 inline mr-1" />}
                    <div className="font-medium">{preset.name}</div>
                    <div className="text-xs opacity-75">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-sm font-medium text-slate-100 mb-3">AI Settings</div>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={aiSettings.removeBackground}
                    onChange={(e) =>
                      setAiSettings((prev) => ({ ...prev, removeBackground: e.target.checked }))
                    }
                    disabled={!featureFlags.isProUser}
                    className="rounded"
                  />
                  {!featureFlags.isProUser && <Lock className="w-3 h-3" />}
                  Remove background
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={aiSettings.enhanceEdges}
                    onChange={(e) => setAiSettings((prev) => ({ ...prev, enhanceEdges: e.target.checked }))}
                    className="rounded"
                  />
                  Enhance subject edges
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-sm font-medium text-slate-100 mb-3">Engraving Settings</div>
              <div className="space-y-3">
                <label className="grid gap-1">
                  <div className="text-xs text-slate-300">Contrast: {engraveSettings.contrast}</div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={engraveSettings.contrast}
                    onChange={(e) =>
                      setEngraveSettings((prev) => ({ ...prev, contrast: Number(e.target.value) }))
                    }
                    className="w-full"
                  />
                </label>

                <label className="grid gap-1">
                  <div className="text-xs text-slate-300">Dithering</div>
                  <select
                    value={engraveSettings.ditherMode}
                    onChange={(e) =>
                      setEngraveSettings((prev) => ({ ...prev, ditherMode: e.target.value as any }))
                    }
                    className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="stucki">Stucki (recommended)</option>
                    <option value="floyd-steinberg">Floyd-Steinberg</option>
                    <option value="jarvis">Jarvis</option>
                    <option value="atkinson">Atkinson</option>
                    <option value="none">None</option>
                  </select>
                </label>
              </div>
            </div>

            <button
              onClick={handleProcessPhoto}
              disabled={!photoDataUrl || isProcessing}
              className="w-full rounded-md bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Process Photo for Engraving'}
            </button>

            {processedPhotoDataUrl && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="text-sm font-medium text-slate-100 mb-3">Processed Preview</div>
                <div className="aspect-[3/4] bg-slate-900 rounded-lg overflow-hidden">
                  <img
                    src={processedPhotoDataUrl}
                    alt="Processed preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'frame' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-sm font-medium text-slate-100 mb-3">Frame Settings</div>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1">
                  <div className="text-xs text-slate-300">Photo size</div>
                  <select
                    value={frameSettings.photoSizePreset}
                    onChange={(e) => handlePhotoSizePresetChange(e.target.value as PhotoSizePreset)}
                    disabled={!featureFlags.isProUser && frameSettings.photoSizePreset !== '10x15'}
                    className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="10x15">10×15 cm</option>
                    <option value="13x18">13×18 cm {!featureFlags.isProUser && '🔒'}</option>
                    <option value="15x20">15×20 cm {!featureFlags.isProUser && '🔒'}</option>
                    <option value="custom">Custom {!featureFlags.isProUser && '🔒'}</option>
                  </select>
                </label>

                <label className="grid gap-1">
                  <div className="text-xs text-slate-300">Thickness (mm)</div>
                  <select
                    value={frameSettings.thicknessMm}
                    onChange={(e) =>
                      setFrameSettings((prev) => ({ ...prev, thicknessMm: Number(e.target.value) as MaterialThickness }))
                    }
                    className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  >
                    <option value={3}>3 mm</option>
                    <option value={4}>4 mm</option>
                    <option value={6}>6 mm</option>
                  </select>
                </label>

                {frameSettings.photoSizePreset === 'custom' && featureFlags.isProUser && (
                  <>
                    <label className="grid gap-1">
                      <div className="text-xs text-slate-300">Width (mm)</div>
                      <input
                        type="number"
                        value={frameSettings.photoWidthMm}
                        onChange={(e) =>
                          setFrameSettings((prev) => ({ ...prev, photoWidthMm: Number(e.target.value) }))
                        }
                        className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                      />
                    </label>
                    <label className="grid gap-1">
                      <div className="text-xs text-slate-300">Height (mm)</div>
                      <input
                        type="number"
                        value={frameSettings.photoHeightMm}
                        onChange={(e) =>
                          setFrameSettings((prev) => ({ ...prev, photoHeightMm: Number(e.target.value) }))
                        }
                        className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                      />
                    </label>
                  </>
                )}

                <label className="grid gap-1">
                  <div className="text-xs text-slate-300">Border (mm)</div>
                  <input
                    type="number"
                    value={frameSettings.borderMm}
                    onChange={(e) =>
                      setFrameSettings((prev) => ({ ...prev, borderMm: Number(e.target.value) }))
                    }
                    className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  />
                </label>

                <label className="grid gap-1">
                  <div className="text-xs text-slate-300">Corner radius (mm)</div>
                  <input
                    type="number"
                    value={frameSettings.cornerRadiusMm}
                    onChange={(e) =>
                      setFrameSettings((prev) => ({ ...prev, cornerRadiusMm: Number(e.target.value) }))
                    }
                    className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  />
                </label>

                <label className="grid gap-1">
                  <div className="text-xs text-slate-300">Curve strength</div>
                  <select
                    value={frameSettings.curveStrength}
                    onChange={(e) =>
                      setFrameSettings((prev) => ({ ...prev, curveStrength: e.target.value as CurveStrength }))
                    }
                    className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="gentle">Gentle</option>
                    <option value="medium">Medium</option>
                    <option value="strong">Strong</option>
                  </select>
                </label>

                <label className="grid gap-1">
                  <div className="text-xs text-slate-300">Stand type</div>
                  <select
                    value={frameSettings.standType}
                    onChange={(e) =>
                      setFrameSettings((prev) => ({ ...prev, standType: e.target.value as StandType }))
                    }
                    disabled={!featureFlags.isProUser && frameSettings.standType !== 'slot'}
                    className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="slot">Slot stand</option>
                    <option value="finger_joint">Finger-joint {!featureFlags.isProUser && '🔒'}</option>
                  </select>
                </label>

                <label className="grid gap-1">
                  <div className="text-xs text-slate-300">Kerf (mm)</div>
                  <input
                    type="number"
                    step={0.01}
                    value={frameSettings.kerfMm}
                    onChange={(e) =>
                      setFrameSettings((prev) => ({ ...prev, kerfMm: Number(e.target.value) }))
                    }
                    className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  />
                </label>

                <div className="col-span-2 grid grid-cols-3 gap-2">
                  <label className="grid gap-1">
                    <div className="text-xs text-slate-300">Segment (mm)</div>
                    <input
                      type="number"
                      step={0.5}
                      min={6}
                      max={10}
                      value={frameSettings.kerfSegmentLengthMm}
                      onChange={(e) =>
                        setFrameSettings((prev) => ({ ...prev, kerfSegmentLengthMm: Number(e.target.value) }))
                      }
                      className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    />
                  </label>

                  <label className="grid gap-1">
                    <div className="text-xs text-slate-300">Gap (mm)</div>
                    <input
                      type="number"
                      step={0.5}
                      min={2}
                      max={4}
                      value={frameSettings.kerfGapLengthMm}
                      onChange={(e) =>
                        setFrameSettings((prev) => ({ ...prev, kerfGapLengthMm: Number(e.target.value) }))
                      }
                      className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    />
                  </label>

                  <label className="grid gap-1">
                    <div className="text-xs text-slate-300">Row spacing (mm)</div>
                    <input
                      type="number"
                      step={0.1}
                      min={1.5}
                      max={5}
                      value={frameSettings.kerfRowSpacingMm}
                      onChange={(e) =>
                        setFrameSettings((prev) => ({ ...prev, kerfRowSpacingMm: Number(e.target.value) }))
                      }
                      className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    />
                  </label>
                </div>

                <div className="col-span-2 border-t border-slate-800 pt-3 mt-2">
                  <div className="text-xs text-slate-400 mb-2">Bending Zone</div>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="grid gap-1">
                      <div className="text-xs text-slate-300">Bend zone (mm)</div>
                      <input
                        type="number"
                        step={1}
                        min={18}
                        max={30}
                        value={frameSettings.bendZoneHeightMm}
                        onChange={(e) =>
                          setFrameSettings((prev) => ({ ...prev, bendZoneHeightMm: Number(e.target.value) }))
                        }
                        className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                      />
                    </label>

                    <label className="grid gap-1">
                      <div className="text-xs text-slate-300">Support lip (mm)</div>
                      <input
                        type="number"
                        step={1}
                        min={8}
                        max={12}
                        value={frameSettings.supportLipHeightMm}
                        onChange={(e) =>
                          setFrameSettings((prev) => ({ ...prev, supportLipHeightMm: Number(e.target.value) }))
                        }
                        className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                      />
                    </label>

                    <label className="grid gap-1">
                      <div className="text-xs text-slate-300">Slot depth (mm)</div>
                      <input
                        type="number"
                        step={1}
                        min={6}
                        max={10}
                        value={frameSettings.slotDepthMm}
                        onChange={(e) =>
                          setFrameSettings((prev) => ({ ...prev, slotDepthMm: Number(e.target.value) }))
                        }
                        className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {result.warnings.length > 0 && (
                <div className="mt-3 space-y-1 text-xs text-amber-300">
                  {result.warnings.map((w, i) => (
                    <div key={i}>{w}</div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-sm font-medium text-slate-100 mb-3">
                <Download className="inline w-4 h-4 mr-2" />
                Export
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={exportSingleSvg}
                  className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900"
                >
                  SVG
                </button>
                <button
                  onClick={exportSvgZip}
                  disabled={!featureFlags.isProUser}
                  className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!featureFlags.isProUser && <Lock className="inline w-3 h-3 mr-1" />}
                  ZIP
                </button>
                <button
                  onClick={exportDxf}
                  disabled={!featureFlags.isProUser}
                  className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!featureFlags.isProUser && <Lock className="inline w-3 h-3 mr-1" />}
                  DXF
                </button>
                <button
                  onClick={exportPdf}
                  disabled={!featureFlags.isProUser}
                  className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!featureFlags.isProUser && <Lock className="inline w-3 h-3 mr-1" />}
                  PDF
                </button>
              </div>
              <div className="mt-3 text-xs text-slate-400">
                <div className="font-medium mb-1">Layer colors:</div>
                <div className="flex gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-red-500 rounded"></span> CUT
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-black rounded border border-slate-600"></span> ENGRAVE
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-blue-500 rounded"></span> SCORE
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="text-sm font-medium text-slate-100">Preview</div>
          <div className="flex items-center gap-2">
            {previewMode === '2d' && (
              <select
                value={previewTarget}
                onChange={(e) => setPreviewTarget(e.target.value as 'combined' | 'back' | 'stand')}
                className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-200"
              >
                <option value="combined">All Pieces</option>
                <option value="back">Front Plate</option>
                <option value="stand">Side Supports</option>
              </select>
            )}
            <div className="inline-flex rounded-md border border-slate-800 bg-slate-950 overflow-hidden">
              <button
                type="button"
                onClick={() => setPreviewMode('2d')}
                className={`px-3 py-1.5 text-xs ${previewMode === '2d' ? 'bg-slate-800 text-slate-100' : 'text-slate-300 hover:bg-slate-900'}`}
              >
                2D
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('3d')}
                className={`px-3 py-1.5 text-xs ${previewMode === '3d' ? 'bg-slate-800 text-slate-100' : 'text-slate-300 hover:bg-slate-900'}`}
              >
                <Box className="inline w-3 h-3 mr-1" />
                3D
              </button>
            </div>

            <button
              type="button"
              onClick={zoomOut}
              className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 hover:bg-slate-900"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <input
              type="range"
              min={25}
              max={400}
              value={Math.round(zoom * 100)}
              onChange={(e) => setZoom(clampZoom(Number(e.target.value) / 100))}
              className="w-28"
            />

            <div className="w-12 text-right text-xs tabular-nums text-slate-300">{Math.round(zoom * 100)}%</div>

            <button
              type="button"
              onClick={zoomIn}
              className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 hover:bg-slate-900"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={fitToView}
              className="rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-900"
            >
              Fit
            </button>
          </div>
        </div>

        {previewMode === '2d' ? (
          <div ref={previewContainerRef} className="h-[75vh] overflow-auto rounded-lg border border-slate-800 bg-white p-2" onWheel={handleWheel}>
            <div
              className="[&>svg]:block [&>svg]:max-w-none"
              style={{ transform: `scale(${zoom})`, transformOrigin: '0 0' }}
              dangerouslySetInnerHTML={{ __html: previewSvg }}
            />
          </div>
        ) : (
          <CurvedPhotoFramePreview3D
            result={result}
            photoWidthMm={frameSettings.photoWidthMm}
            photoHeightMm={frameSettings.photoHeightMm}
            borderMm={frameSettings.borderMm}
            bendZoneHeightMm={frameSettings.bendZoneHeightMm ?? 24}
            supportLipHeightMm={frameSettings.supportLipHeightMm ?? 10}
            curveStrength={frameSettings.curveStrength}
            materialThickness={frameSettings.thicknessMm}
          />
        )}
      </div>
    </div>
  );
}
