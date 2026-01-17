'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useToolUx } from '@/components/ux/ToolUxProvider';
import type { JigsawInputs, PuzzleMode, KnobStyle, LayoutMode, FitMode, MaterialSheet, BackingBoard, PuzzleResult } from '../types/jigsaw';
import type { JigsawV3Settings, V3FeatureFlags, TrueNestingSettings, PocketFrameSettings, PhotoEngravingSettings, AIImageSettings, DifficultySettings, ProductKitSettings } from '../types/jigsawV3';
import { JIGSAW_PRESETS, MATERIAL_SHEET_PRESETS } from '../types/jigsaw';
import { V3_DEFAULTS } from '../types/jigsawV3';
import { generatePuzzle, generatePuzzleWarnings, generateFilename } from '../core/puzzleGenerator';
import { generateJigsaw as generateJigsawPathOps } from '../core/index';
import type { JigsawSettings, PuzzleTemplate } from '../types/jigsawV2';
import { DEFAULTS, LIMITS } from '../config/defaults';
import { PUZZLE_TEMPLATES } from '../core/templates';
import { exportProductKit } from '../core/productKitExport';
import { FONTS as SHARED_FONTS, loadFont, textToPathD, type FontId } from '@/lib/fonts/sharedFontRegistry';
import { createArtifact, addToPriceCalculator } from '@/lib/artifacts/client';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface JigsawMakerToolProps {
  onResetCallback?: (callback: () => void) => void;
  onGetExportPayload?: (getExportPayload: () => Promise<{ svg: string; name?: string; meta?: any }> | { svg: string; name?: string; meta?: any }) => void;
}

export function JigsawMakerTool({ onResetCallback, onGetExportPayload }: JigsawMakerToolProps) {
  const { api } = useToolUx();
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  useEffect(() => {
    api.setIsEmpty(false);
  }, [api]);

  // Core settings
  const [mode, setMode] = useState<PuzzleMode>(DEFAULTS.mode);
  const [puzzleTemplate, setPuzzleTemplate] = useState<PuzzleTemplate>('rectangle');
  const [centerCutout, setCenterCutout] = useState(false);
  const [centerCutoutRatio, setCenterCutoutRatio] = useState(0.3);
  const [centerCutoutText, setCenterCutoutText] = useState('');
  const [centerCutoutFontId, setCenterCutoutFontId] = useState<FontId>(() => (SHARED_FONTS[0]?.id ?? 'Milkshake'));
  const [textPreviewSvg, setTextPreviewSvg] = useState<string | null>(null);
  const [widthMm, setWidthMm] = useState(DEFAULTS.widthMm);
  const [heightMm, setHeightMm] = useState(DEFAULTS.heightMm);
  const [rows, setRows] = useState(DEFAULTS.rows);
  const [columns, setColumns] = useState(DEFAULTS.columns);
  const [knobStyle, setKnobStyle] = useState<KnobStyle>(DEFAULTS.knobStyle);
  const [cornerRadius, setCornerRadius] = useState(DEFAULTS.cornerRadius);
  const [backingCornerRadius, setBackingCornerRadius] = useState(DEFAULTS.cornerRadius);
  const [kerfOffset, setKerfOffset] = useState(DEFAULTS.kerfOffset);
  const [randomSeed, setRandomSeed] = useState(DEFAULTS.randomSeed);
  
  // Photo mode
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>();
  const [maskedImageDataUrl, setMaskedImageDataUrl] = useState<string | undefined>();
  const [imageName, setImageName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Photo processing settings
  const [photoProcessing, setPhotoProcessing] = useState({
    enabled: false,
    grayscale: true,
    brightness: 0,
    contrast: 0,
    gamma: 1.0,
    invert: false,
    ditherMode: 'none' as 'none' | 'floyd-steinberg' | 'atkinson',
  });
  
  // Store original image for reprocessing
  const [originalImageUrl, setOriginalImageUrl] = useState<string | undefined>();
  
  // V2 Production features
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(DEFAULTS.layoutMode);
  const [materialSheet, setMaterialSheet] = useState<MaterialSheet>(DEFAULTS.materialSheet);
  const [fitMode, setFitMode] = useState<FitMode>(DEFAULTS.fitMode);
  const [backingBoard, setBackingBoard] = useState<BackingBoard>(DEFAULTS.backingBoard);
  
  // Preview zoom
  const [previewZoom, setPreviewZoom] = useState(100);
  const [pieceNumbering, setPieceNumbering] = useState(DEFAULTS.pieceNumbering);
  
  // V3 Premium features
  const [v3Features, setV3Features] = useState<V3FeatureFlags>(V3_DEFAULTS.v3Features!);
  const [difficulty, setDifficulty] = useState<DifficultySettings>(V3_DEFAULTS.difficulty!);
  const [trueNesting, setTrueNesting] = useState<TrueNestingSettings>(V3_DEFAULTS.trueNesting!);
  const [pocketFrame, setPocketFrame] = useState<PocketFrameSettings>(V3_DEFAULTS.pocketFrame!);
  const [photoEngraving, setPhotoEngraving] = useState<PhotoEngravingSettings>(V3_DEFAULTS.photoEngraving!);
  const [aiImage, setAIImage] = useState<AIImageSettings>(V3_DEFAULTS.aiImage!);
  const [productKit, setProductKit] = useState<ProductKitSettings>(V3_DEFAULTS.productKit!);
  
  // Jigsaw Generator features (always enabled)
  const [marginMm, setMarginMm] = useState(DEFAULTS.marginMm);
  const [knobSizePct, setKnobSizePct] = useState(DEFAULTS.knobSizePct);
  const [knobRoundness, setKnobRoundness] = useState(DEFAULTS.knobRoundness);
  const [knobJitter, setKnobJitter] = useState(DEFAULTS.knobJitter);
  const [clearanceMm, setClearanceMm] = useState(DEFAULTS.clearanceMm);
  const [compensateKerf, setCompensateKerf] = useState(DEFAULTS.compensateKerf);
  const [exportMode, setExportMode] = useState<'cut-lines' | 'piece-outlines'>(DEFAULTS.exportMode);
  const [showPieceIds, setShowPieceIds] = useState(DEFAULTS.showPieceIds);
  
  // PathOps loading state
  const [isLoadingPathOps, setIsLoadingPathOps] = useState(false);
  const [pathOpsError, setPathOpsError] = useState<string | null>(null);
  
  // Font preview effect for center cutout text
  useEffect(() => {
    if (!centerCutoutText.trim()) {
      setTextPreviewSvg(null);
      return;
    }
    
    let cancelled = false;
    const previewText = centerCutoutText.trim() || t('jigsaw.preview.title');
    const previewSize = 12;

    (async () => {
      try {
        const font = await loadFont(centerCutoutFontId);
        const res = textToPathD(font, previewText, previewSize, 0);
        if (cancelled || !res?.pathD) return;

        const pathD = res.pathD;
        const w = res.width;
        const h = res.height;
        const pad = 2;
        const vb = `${-pad} ${-h - pad} ${w + pad * 2} ${h + pad * 2}`;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%"><path d="${pathD}" fill="#94a3b8"/></svg>`;
        setTextPreviewSvg(svg);
      } catch {
        setTextPreviewSvg(null);
      }
    })();

    return () => { cancelled = true; };
  }, [centerCutoutText, centerCutoutFontId]);
  
  // Piece shape difficulty slider (0-100)
  const [pieceDifficulty, setPieceDifficulty] = useState(0);
  

  const resetToDefaults = useCallback(() => {
    setMode(DEFAULTS.mode);
    setWidthMm(DEFAULTS.widthMm);
    setHeightMm(DEFAULTS.heightMm);
    setRows(DEFAULTS.rows);
    setColumns(DEFAULTS.columns);
    setKnobStyle(DEFAULTS.knobStyle);
    setCornerRadius(DEFAULTS.cornerRadius);
    setKerfOffset(DEFAULTS.kerfOffset);
    setRandomSeed(DEFAULTS.randomSeed);
    setImageDataUrl(undefined);
    setMaskedImageDataUrl(undefined);
    setImageName('');
    setLayoutMode(DEFAULTS.layoutMode);
    setMaterialSheet(DEFAULTS.materialSheet);
    setFitMode(DEFAULTS.fitMode);
    setBackingBoard(DEFAULTS.backingBoard);
    setPieceNumbering(DEFAULTS.pieceNumbering);
  }, []);

  useEffect(() => {
    if (onResetCallback) {
      onResetCallback(resetToDefaults);
    }
  }, [onResetCallback, resetToDefaults]);

  // Reprocess image when photo processing settings change
  useEffect(() => {
    if (!originalImageUrl || !photoProcessing.enabled) return;
    
    async function reprocessImage() {
      try {
        const { processImageForPuzzle } = await import('../utils/imageProcessing');
        const processedUrl = await processImageForPuzzle(originalImageUrl!, photoProcessing);
        setImageDataUrl(processedUrl);
      } catch (error) {
        console.error('Error reprocessing image:', error);
      }
    }
    
    reprocessImage();
  }, [originalImageUrl, photoProcessing]);

  useEffect(() => {
    let cancelled = false;

    async function mask() {
      if (mode !== 'photo' || !imageDataUrl) {
        setMaskedImageDataUrl(undefined);
        return;
      }

      if (layoutMode !== 'assembled') {
        setMaskedImageDataUrl(undefined);
        return;
      }

      if (puzzleTemplate === 'rectangle' && !centerCutout) {
        setMaskedImageDataUrl(undefined);
        return;
      }

      try {
        const { maskImageToTemplate } = await import('../utils/imageProcessing');
        const masked = await maskImageToTemplate(imageDataUrl, {
          widthMm,
          heightMm,
          template: puzzleTemplate,
          cornerRadiusMm: cornerRadius,
          centerCutout,
          centerCutoutRatio,
        });

        if (!cancelled) {
          setMaskedImageDataUrl(masked);
        }
      } catch (error) {
        console.error('Error masking image:', error);
        if (!cancelled) {
          setMaskedImageDataUrl(undefined);
        }
      }
    }

    mask();

    return () => {
      cancelled = true;
    };
  }, [mode, imageDataUrl, layoutMode, puzzleTemplate, widthMm, heightMm, cornerRadius, centerCutout, centerCutoutRatio]);

  const inputs: JigsawInputs | JigsawV3Settings = useMemo(() => {
    const baseInputs: JigsawInputs = {
      mode,
      widthMm,
      heightMm,
      rows,
      columns,
      knobStyle,
      cornerRadius,
      kerfOffset,
      randomSeed,
      imageDataUrl,
      layoutMode,
      materialSheet,
      fitMode,
      backingBoard,
      pieceNumbering,
      marginMm,
      knobSizePct,
      knobRoundness,
      knobJitter,
      clearanceMm,
      compensateKerf,
      exportMode,
      showPieceIds,
    };
    
    // If V3 is enabled, return V3Settings
    if (v3Features.v3Enabled) {
      return {
        ...baseInputs,
        version: '3.0',
        v3Features,
        trueNesting,
        pocketFrame,
        photoEngraving,
        aiImage,
        productKit,
      } as JigsawV3Settings;
    }
    
    return baseInputs;
  }, [mode, widthMm, heightMm, rows, columns, knobStyle, cornerRadius, kerfOffset, randomSeed, imageDataUrl, layoutMode, materialSheet, fitMode, backingBoard, pieceNumbering, marginMm, knobSizePct, knobRoundness, knobJitter, clearanceMm, compensateKerf, exportMode, showPieceIds, v3Features, trueNesting, pocketFrame, photoEngraving, aiImage, productKit]);

  const [puzzleResult, setPuzzleResult] = useState<PuzzleResult>({
    pieces: [],
    cutLayerSvg: '',
    engraveLayerSvg: undefined,
    fullSvg: '',
    warnings: [],
  });
  
  // Memoize settings objects to prevent unnecessary re-renders
  const pathOpsSettings = useMemo<JigsawSettings>(() => ({
    widthMm,
    heightMm,
    rows,
    columns,
    template: puzzleTemplate,
    centerCutout,
    centerCutoutRatio,
    centerCutoutText: centerCutoutText || undefined,
    centerCutoutFontId: centerCutoutFontId || undefined,
    randomSeed,
    imageDataUrl: mode === 'photo' ? (maskedImageDataUrl ?? imageDataUrl) : undefined,
    cornerRadiusMm: cornerRadius,
    kerfMm: kerfOffset,
    clearanceMm,
    layoutMode: layoutMode === 'assembled' ? 'assembled' : 'packed',
    sheetPreset: 'custom',
    customSheetWidth: materialSheet.widthMm,
    customSheetHeight: materialSheet.heightMm,
    marginMm: materialSheet.marginMm,
    gapMm: materialSheet.gapMm,
    pieceNumbering,
    numberingStyle: 'alphanumeric',
    includeBacking: backingBoard.enabled,
    backingMarginMm: backingBoard.marginMm,
    backingCornerRadiusMm: backingCornerRadius,
    hangingHoles: backingBoard.hangingHoles,
    hangingHoleDiameter: backingBoard.hangingHoleDiameter,
    hangingHoleSpacing: backingBoard.hangingHoleSpacing,
    hangingHoleYOffset: backingBoard.hangingHoleYOffset,
    magnetHoles: backingBoard.magnetHoles,
    magnetHoleDiameter: backingBoard.magnetHoleDiameter,
    magnetHoleInset: backingBoard.magnetHoleInset,
    difficulty: pieceDifficulty,
    knobStyle: knobStyle as 'classic' | 'organic' | 'simple',
    knobSizePct,
    knobRoundness,
    knobJitter,
  }), [widthMm, heightMm, rows, columns, puzzleTemplate, centerCutout, centerCutoutRatio, centerCutoutText, centerCutoutFontId, randomSeed, mode, imageDataUrl, maskedImageDataUrl, cornerRadius, kerfOffset, clearanceMm, layoutMode, materialSheet.widthMm, materialSheet.heightMm, materialSheet.marginMm, materialSheet.gapMm, pieceNumbering, backingBoard.enabled, backingBoard.marginMm, backingCornerRadius, backingBoard.hangingHoles, backingBoard.hangingHoleDiameter, backingBoard.hangingHoleSpacing, backingBoard.hangingHoleYOffset, backingBoard.magnetHoles, backingBoard.magnetHoleDiameter, backingBoard.magnetHoleInset, pieceDifficulty, knobStyle, knobSizePct, knobRoundness, knobJitter]);

  useEffect(() => {
    let cancelled = false;
    
    async function generate() {
      try {
        setIsLoadingPathOps(true);
        setPathOpsError(null);
        
        // Use PathOps generator for all modes (supports templates and shapes)
        // Photo mode with image is handled by adding the image as a background
        if (mode === 'photo' && puzzleTemplate === 'rectangle' && !centerCutout) {
          // Use old generator only for basic rectangle photo puzzles
          console.log('Generating puzzle with classic generator (photo mode, rectangle)');
          const result = await generatePuzzle(inputs as JigsawInputs);
          
          if (!cancelled) {
            setPuzzleResult(result);
            setIsLoadingPathOps(false);
          }
        } else {
          console.log('Generating puzzle with PathOps engine');
          const result = await generateJigsawPathOps(pathOpsSettings);
          
          if (!cancelled) {
            console.log('PathOps puzzle generated:', result);
            
            // Convert PathOps result to old format for compatibility
            setPuzzleResult({
              pieces: result.pieces.map(p => ({
                row: p.row,
                col: p.col,
                path: p.path,
              })),
              cutLayerSvg: result.cutLayerSvg,
              engraveLayerSvg: result.engraveLayerSvg,
              fullSvg: result.svg,
              warnings: result.warnings,
            });
            
            setIsLoadingPathOps(false);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error generating puzzle:', error);
          const errorMsg = (error as Error).message;
          setPathOpsError(errorMsg);
          setPuzzleResult({
            pieces: [],
            cutLayerSvg: '',
            engraveLayerSvg: undefined,
            fullSvg: '',
            warnings: ['Puzzle generation error: ' + errorMsg],
          });
          setIsLoadingPathOps(false);
        }
      }
    }
    
    generate();
    
    return () => {
      cancelled = true;
    };
  }, [mode, inputs, pathOpsSettings, puzzleTemplate, centerCutout]);
  const warnings = useMemo(() => {
    try {
      return generatePuzzleWarnings(inputs as JigsawInputs);
    } catch (error) {
      console.error('Error generating warnings:', error);
      return [];
    }
  }, [inputs]);

  const pieceCount = rows * columns;
  const pieceWidth = (widthMm / columns).toFixed(1);
  const pieceHeight = (heightMm / rows).toFixed(1);

  const getExportPayload = useCallback(() => {
    const svg = puzzleResult.fullSvg;
    const name = generateFilename(inputs);
    return {
      svg,
      name,
      meta: {
        bboxMm: { width: widthMm, height: heightMm },
        mode,
        rows,
        columns,
      },
    };
  }, [columns, heightMm, inputs, mode, puzzleResult.fullSvg, rows, widthMm]);

  useEffect(() => {
    onGetExportPayload?.(getExportPayload);
  }, [getExportPayload, onGetExportPayload]);

  function handleExport() {
    const filename = generateFilename(inputs);
    // Make stroke visible for preview (0.5mm instead of 0.001mm hairline)
    const visibleSvg = puzzleResult.fullSvg.replace(/stroke-width="0\.001"/g, 'stroke-width="0.5"');
    downloadTextFile(filename, visibleSvg, 'image/svg+xml');
  }

  function handleExportCutOnly() {
    const filename = generateFilename(inputs).replace('.svg', '-cut.svg');
    // Generate SVG with only CUT layers
    const cutOnlySvg = generateCutOnlySvg();
    // Make stroke visible for preview
    const visibleSvg = cutOnlySvg.replace(/stroke-width="0\.001"/g, 'stroke-width="0.5"');
    downloadTextFile(filename, visibleSvg, 'image/svg+xml');
  }

  function generateCutOnlySvg(): string {
    // Extract only CUT layers from full SVG
    const parser = new DOMParser();
    const doc = parser.parseFromString(puzzleResult.fullSvg, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    
    if (!svg) return puzzleResult.fullSvg;
    
    // Remove ENGRAVE layers
    const engraveLayers = svg.querySelectorAll('[id^="ENGRAVE"]');
    engraveLayers.forEach(layer => layer.remove());
    
    const serializer = new XMLSerializer();
    return serializer.serializeToString(doc);
  }

  function handleRegenerate() {
    setRandomSeed(Math.floor(Math.random() * 1000000));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const originalUrl = event.target?.result as string;
      setOriginalImageUrl(originalUrl);
      
      // Process image if photo processing is enabled
      if (photoProcessing.enabled) {
        try {
          const { processImageForPuzzle } = await import('../utils/imageProcessing');
          const processedUrl = await processImageForPuzzle(originalUrl, photoProcessing);
          setImageDataUrl(processedUrl);
        } catch (error) {
          console.error('Error processing image:', error);
          setImageDataUrl(originalUrl);
        }
      } else {
        setImageDataUrl(originalUrl);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveImage() {
    setImageDataUrl(undefined);
    setImageName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function applyPreset(preset: typeof JIGSAW_PRESETS[number]) {
    setRows(preset.rows);
    setColumns(preset.columns);
  }

  async function handleExportProductKit() {
    const filename = generateFilename(inputs as JigsawInputs);
    const cutOnlySvg = generateCutOnlySvg();
    
    await exportProductKit(
      {
        cutSvg: cutOnlySvg,
        fullSvg: puzzleResult.fullSvg,
        engravingPng: (inputs as any)._processedEngravingPng,
        settings: inputs as JigsawV3Settings,
      },
      productKit,
      filename
    );
  }

  async function handleAddToPriceCalculator() {
    try {
      const filename = generateFilename(inputs as JigsawInputs);
      const svg = puzzleResult.fullSvg;
      
      const artifact = await createArtifact({
        toolSlug: 'jigsaw-maker',
        name: filename.replace('.svg', ''),
        svg,
        meta: {
          bboxMm: { width: widthMm, height: heightMm },
          operations: { hasCuts: true },
          notes: `${rows}x${columns} puzzle, ${pieceCount} pieces`,
        },
      });
      
      addToPriceCalculator(artifact);
    } catch (e) {
      console.error('Failed to add to price calculator:', e);
    }
  }

  return (
    <div className="lfs-tool lfs-tool-jigsaw-maker flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-900 bg-slate-950/80">
        <div className="mx-auto flex w-full items-center justify-between gap-4 px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold text-slate-100 md:text-base">{t('tools.jigsaw-maker.title')}</h1>
            <p className="text-[11px] text-slate-400">{t('jigsaw.header.subtitle')}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full flex-1 flex-col gap-4 px-4 py-4 md:flex-row">
        <section className="w-full md:w-80 lg:w-96">
          <div className="max-h-[calc(100vh-96px)] overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/40 p-3 md:p-4">
            <div className="space-y-4">
              
              {/* Puzzle Mode */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">{t('jigsaw.puzzle_mode.title')}</div>
                <div className="mt-3 space-y-2">
                  {(['classic', 'photo'] as PuzzleMode[]).map((m) => (
                    <label key={m} className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="mode"
                        value={m}
                        checked={mode === m}
                        onChange={() => setMode(m)}
                        className="mt-1 border-slate-700"
                      />
                      <div>
                        <div className="text-xs font-medium text-slate-200">{t(`jigsaw.mode.${m}.label`)}</div>
                        <div className="text-[10px] text-slate-400">{t(`jigsaw.mode.${m}.description`)}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Photo Upload (Photo mode only) */}
              {mode === 'photo' && (
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                  <div className="text-sm font-medium text-slate-100">{t('jigsaw.photo_upload.title')}</div>
                  <div className="mt-3 space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label
                      htmlFor="photo-upload"
                      className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-slate-700 bg-slate-900 px-4 py-3 text-xs text-slate-300 hover:bg-slate-800"
                    >
                      {imageDataUrl ? t('jigsaw.change_image.label') : t('jigsaw.upload_image.label')}
                    </label>
                    {imageName && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 truncate">{imageName}</span>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="text-red-400 hover:text-red-300"
                        >
                          {t('jigsaw.remove.label')}
                        </button>
                      </div>
                    )}
                    
                    {/* Photo Processing */}
                    <div className="space-y-2 border-t border-slate-800 pt-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={photoProcessing.enabled}
                          onChange={(e) => setPhotoProcessing({ ...photoProcessing, enabled: e.target.checked })}
                          className="rounded border-slate-800"
                        />
                        <span className="text-xs text-slate-300">{t('jigsaw.engrave_prep.label')}</span>
                      </label>
                      
                      {photoProcessing.enabled && (
                        <div className="ml-6 space-y-2">
                          {/* Grayscale */}
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={photoProcessing.grayscale}
                              onChange={(e) => setPhotoProcessing({ ...photoProcessing, grayscale: e.target.checked })}
                              className="rounded border-slate-800"
                            />
                            <span className="text-[10px] text-slate-400">{t('jigsaw.grayscale.label')}</span>
                          </label>
                          
                          {/* Brightness */}
                          <label className="grid gap-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-400">{t('jigsaw.brightness_only.label')}</span>
                              <span className="text-slate-300">{photoProcessing.brightness}</span>
                            </div>
                            <input
                              type="range"
                              min={-100}
                              max={100}
                              value={photoProcessing.brightness}
                              onChange={(e) => setPhotoProcessing({ ...photoProcessing, brightness: Number(e.target.value) })}
                              className="w-full"
                            />
                          </label>
                          
                          {/* Contrast */}
                          <label className="grid gap-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-400">{t('jigsaw.contrast_only.label')}</span>
                              <span className="text-slate-300">{photoProcessing.contrast}</span>
                            </div>
                            <input
                              type="range"
                              min={-100}
                              max={100}
                              value={photoProcessing.contrast}
                              onChange={(e) => setPhotoProcessing({ ...photoProcessing, contrast: Number(e.target.value) })}
                              className="w-full"
                            />
                          </label>
                          
                          {/* Gamma */}
                          <label className="grid gap-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-400">{t('jigsaw.gamma_only.label')}</span>
                              <span className="text-slate-300">{photoProcessing.gamma.toFixed(1)}</span>
                            </div>
                            <input
                              type="range"
                              min={0.2}
                              max={3}
                              step={0.1}
                              value={photoProcessing.gamma}
                              onChange={(e) => setPhotoProcessing({ ...photoProcessing, gamma: Number(e.target.value) })}
                              className="w-full"
                            />
                          </label>
                          
                          {/* Invert */}
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={photoProcessing.invert}
                              onChange={(e) => setPhotoProcessing({ ...photoProcessing, invert: e.target.checked })}
                              className="rounded border-slate-800"
                            />
                            <span className="text-[10px] text-slate-400">{t('jigsaw.invert.label')}</span>
                          </label>
                          
                          {/* Dithering */}
                          <label className="grid gap-1">
                            <div className="text-[10px] text-slate-400">{t('jigsaw.dithering.label')}</div>
                            <select
                              value={photoProcessing.ditherMode}
                              onChange={(e) => setPhotoProcessing({ ...photoProcessing, ditherMode: e.target.value as any })}
                              className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] text-slate-100"
                            >
                              <option value="none">{t('jigsaw.dithering.none')}</option>
                              <option value="floyd-steinberg">{t('jigsaw.dithering.floyd_steinberg')}</option>
                              <option value="atkinson">{t('jigsaw.dithering.atkinson')}</option>
                            </select>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Presets */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">{t('jigsaw.quick_presets.title')}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {JIGSAW_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-800"
                      title={t(`jigsaw.preset.${preset.rows}x${preset.columns}.description`)}
                    >
                      {t(`jigsaw.preset.${preset.rows}x${preset.columns}.label`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Puzzle Template */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">{t('jigsaw.puzzle_shape.label')}</div>
                <div className="mt-3 space-y-2">
                  <select
                    value={puzzleTemplate}
                    onChange={(e) => setPuzzleTemplate(e.target.value as PuzzleTemplate)}
                    className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                  >
                    {PUZZLE_TEMPLATES.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {t(`jigsaw.template.${tpl.id}.label`)}
                      </option>
                    ))}
                  </select>
                  <div className="text-[10px] text-slate-500">
                    {t(`jigsaw.template.${puzzleTemplate}.description`)}
                  </div>
                  
                  {/* Center Cutout Option - available for all templates */}
                  <div className="border-t border-slate-800 pt-2 mt-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={centerCutout}
                        onChange={(e) => setCenterCutout(e.target.checked)}
                        className="rounded border-slate-800"
                      />
                      <span className="text-xs text-slate-300">{t('jigsaw.center_cutout.label')}</span>
                    </label>
                    <div className="text-[10px] text-slate-500 mt-1">{t('jigsaw.center_cutout.helper')}</div>
                    
                    {centerCutout && (
                      <>
                        <label className="grid gap-1 mt-2">
                          <div className="text-[10px] text-slate-400">{t('jigsaw.cutout_size.label').replace('{value}', String(Math.round(centerCutoutRatio * 100)))}</div>
                          <input
                            type="range"
                            min={20}
                            max={50}
                            value={centerCutoutRatio * 100}
                            onChange={(e) => setCenterCutoutRatio(Number(e.target.value) / 100)}
                            className="w-full"
                          />
                        </label>
                        <label className="grid gap-1 mt-2">
                          <div className="text-[10px] text-slate-400">{t('jigsaw.center_text.label')}</div>
                          <textarea
                            value={centerCutoutText}
                            onChange={(e) => setCenterCutoutText(e.target.value)}
                            placeholder={t('jigsaw.center_text.placeholder')}
                            rows={3}
                            className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 resize-none"
                          />
                        </label>
                        {textPreviewSvg && (
                          <div
                            className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 p-1 mt-1"
                            dangerouslySetInnerHTML={{ __html: textPreviewSvg }}
                          />
                        )}
                        <label className="grid gap-1 mt-2">
                          <div className="text-[10px] text-slate-400">{t('jigsaw.font.label')}</div>
                          <select
                            value={centerCutoutFontId}
                            onChange={(e) => setCenterCutoutFontId(e.target.value as FontId)}
                            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-200"
                          >
                            {SHARED_FONTS.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Dimensions */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">{t('jigsaw.dimensions.title')}</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('jigsaw.width_mm.label')}</div>
                    <input
                      type="number"
                      min={LIMITS.minWidthMm}
                      max={LIMITS.maxWidthMm}
                      value={widthMm}
                      onChange={(e) => setWidthMm(Number(e.target.value))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('jigsaw.height_mm.label')}</div>
                    <input
                      type="number"
                      min={LIMITS.minHeightMm}
                      max={LIMITS.maxHeightMm}
                      value={heightMm}
                      onChange={(e) => setHeightMm(Number(e.target.value))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                </div>
              </div>

              {/* Grid */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">{t('jigsaw.grid.title')}</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('jigsaw.rows.label')}</div>
                    <input
                      type="number"
                      min={LIMITS.minRows}
                      max={LIMITS.maxRows}
                      value={rows}
                      onChange={(e) => setRows(Number(e.target.value))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('jigsaw.columns.label')}</div>
                    <input
                      type="number"
                      min={LIMITS.minColumns}
                      max={LIMITS.maxColumns}
                      value={columns}
                      onChange={(e) => setColumns(Number(e.target.value))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                </div>
                <div className="mt-2 text-[10px] text-slate-500">
                  {t('jigsaw.grid.summary')
                    .replace('{pieces}', String(pieceCount))
                    .replace('{pieceWidth}', String(pieceWidth))
                    .replace('{pieceHeight}', String(pieceHeight))}
                </div>
              </div>

              {/* Knob Style */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">{t('jigsaw.knob_style.label')}</div>
                <div className="mt-3">
                  <select
                    value={knobStyle}
                    onChange={(e) => setKnobStyle(e.target.value as KnobStyle)}
                    className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                  >
                    {(['classic', 'organic', 'simple'] as KnobStyle[]).map((style) => (
                      <option key={style} value={style}>
                        {t(`jigsaw.knob_style.${style}.label`)}
                      </option>
                    ))}
                  </select>
                  <div className="mt-1 text-[10px] text-slate-500">
                    {t(`jigsaw.knob_style.${knobStyle}.description`)}
                  </div>
                </div>
              </div>

              {/* Layout & Material */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">{t('jigsaw.layout_material.title')}</div>
                <div className="mt-3 space-y-3">
                  {/* Layout Mode */}
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('jigsaw.layout_mode.label')}</div>
                    <select
                      value={layoutMode}
                      onChange={(e) => setLayoutMode(e.target.value as LayoutMode)}
                      className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    >
                      <option value="assembled">{t('jigsaw.layout_mode.assembled')}</option>
                      <option value="packed">{t('jigsaw.layout_mode.packed')}</option>
                    </select>
                  </label>

                  {/* Material Sheet */}
                  <div className="space-y-2">
                    <div className="text-[11px] text-slate-400">{t('jigsaw.material_sheet.label')}</div>
                    <select
                      onChange={(e) => {
                        const preset = MATERIAL_SHEET_PRESETS.find(p => p.name === e.target.value);
                        if (preset) {
                          setMaterialSheet(prev => ({ ...prev, widthMm: preset.widthMm, heightMm: preset.heightMm }));
                        }
                      }}
                      className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    >
                      <option value="">{t('jigsaw.material_sheet.select_preset')}</option>
                      {MATERIAL_SHEET_PRESETS.map((preset) => (
                        <option key={preset.name} value={preset.name}>
                          {preset.name} ({preset.widthMm}×{preset.heightMm}mm)
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder={t('jigsaw.material_sheet.width_placeholder')}
                        value={materialSheet.widthMm}
                        onChange={(e) => setMaterialSheet(prev => ({ ...prev, widthMm: Number(e.target.value) }))}
                        className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                      />
                      <input
                        type="number"
                        placeholder={t('jigsaw.material_sheet.height_placeholder')}
                        value={materialSheet.heightMm}
                        onChange={(e) => setMaterialSheet(prev => ({ ...prev, heightMm: Number(e.target.value) }))}
                        className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder={t('jigsaw.material_sheet.margin_placeholder')}
                        value={materialSheet.marginMm}
                        onChange={(e) => setMaterialSheet(prev => ({ ...prev, marginMm: Number(e.target.value) }))}
                        className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                      />
                      <input
                        type="number"
                        placeholder={t('jigsaw.material_sheet.gap_placeholder')}
                        value={materialSheet.gapMm}
                        onChange={(e) => setMaterialSheet(prev => ({ ...prev, gapMm: Number(e.target.value) }))}
                        className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                      />
                    </div>
                  </div>

                  {/* Fit Mode */}
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('jigsaw.fit_mode.label')}</div>
                    <select
                      value={fitMode}
                      onChange={(e) => setFitMode(e.target.value as FitMode)}
                      className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    >
                      <option value="tight">{t('jigsaw.fit_mode.tight')}</option>
                      <option value="normal">{t('jigsaw.fit_mode.normal')}</option>
                      <option value="loose">{t('jigsaw.fit_mode.loose')}</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* Backing Board */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">{t('jigsaw.backing_board.title')}</div>
                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={backingBoard.enabled}
                      onChange={(e) => setBackingBoard(prev => ({ ...prev, enabled: e.target.checked }))}
                      className="rounded border-slate-800"
                    />
                    <span className="text-xs text-slate-300">{t('jigsaw.backing_board.enable')}</span>
                  </label>
                  {backingBoard.enabled && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <label className="grid gap-1">
                          <div className="text-[10px] text-slate-400">{t('jigsaw.margin_mm.label')}</div>
                          <input
                            type="number"
                            value={backingBoard.marginMm}
                            onChange={(e) => setBackingBoard(prev => ({ ...prev, marginMm: Number(e.target.value) }))}
                            className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                          />
                        </label>
                        <label className="grid gap-1">
                          <div className="text-[10px] text-slate-400">{t('jigsaw.corner_radius.label')}</div>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            value={backingCornerRadius}
                            onChange={(e) => setBackingCornerRadius(Number(e.target.value))}
                            className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                          />
                        </label>
                      </div>
                      
                      {/* Hanging Holes */}
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={backingBoard.hangingHoles}
                          onChange={(e) => setBackingBoard(prev => ({ ...prev, hangingHoles: e.target.checked }))}
                          className="rounded border-slate-800"
                        />
                        <span className="text-[10px] text-slate-400">{t('jigsaw.backing_board.hanging_holes')}</span>
                      </label>
                      {backingBoard.hangingHoles && (
                        <div className="ml-6 grid grid-cols-3 gap-1">
                          <input
                            type="number"
                            placeholder="Ø"
                            title={t('jigsaw.backing_board.hole_diameter_title')}
                            value={backingBoard.hangingHoleDiameter}
                            onChange={(e) => setBackingBoard(prev => ({ ...prev, hangingHoleDiameter: Number(e.target.value) }))}
                            className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] text-slate-100"
                          />
                          <input
                            type="number"
                            placeholder={t('jigsaw.backing_board.hole_spacing_placeholder')}
                            title={t('jigsaw.backing_board.hole_spacing_title')}
                            value={backingBoard.hangingHoleSpacing}
                            onChange={(e) => setBackingBoard(prev => ({ ...prev, hangingHoleSpacing: Number(e.target.value) }))}
                            className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] text-slate-100"
                          />
                          <input
                            type="number"
                            placeholder="Y"
                            title={t('jigsaw.backing_board.hole_y_offset_title')}
                            value={backingBoard.hangingHoleYOffset}
                            onChange={(e) => setBackingBoard(prev => ({ ...prev, hangingHoleYOffset: Number(e.target.value) }))}
                            className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] text-slate-100"
                          />
                        </div>
                      )}
                      
                      {/* Magnet Holes */}
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={backingBoard.magnetHoles}
                          onChange={(e) => setBackingBoard(prev => ({ ...prev, magnetHoles: e.target.checked }))}
                          className="rounded border-slate-800"
                        />
                        <span className="text-[10px] text-slate-400">{t('jigsaw.backing_board.magnet_holes')}</span>
                      </label>
                      {backingBoard.magnetHoles && (
                        <div className="ml-6 grid grid-cols-2 gap-1">
                          <input
                            type="number"
                            placeholder="Ø"
                            title={t('jigsaw.backing_board.magnet_diameter_title')}
                            value={backingBoard.magnetHoleDiameter}
                            onChange={(e) => setBackingBoard(prev => ({ ...prev, magnetHoleDiameter: Number(e.target.value) }))}
                            className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] text-slate-100"
                          />
                          <input
                            type="number"
                            placeholder={t('jigsaw.backing_board.magnet_inset_placeholder')}
                            title={t('jigsaw.backing_board.magnet_inset_title')}
                            value={backingBoard.magnetHoleInset}
                            onChange={(e) => setBackingBoard(prev => ({ ...prev, magnetHoleInset: Number(e.target.value) }))}
                            className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] text-slate-100"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">{t('jigsaw.advanced.title')}</div>
                <div className="mt-3 space-y-3">
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('jigsaw.corner_radius.label')}</div>
                    <input
                      type="number"
                      min={LIMITS.minCornerRadius}
                      max={LIMITS.maxCornerRadius}
                      step={0.5}
                      value={cornerRadius}
                      onChange={(e) => setCornerRadius(Number(e.target.value))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('jigsaw.kerf_offset.label')}</div>
                    <input
                      type="number"
                      min={LIMITS.minKerfOffset}
                      max={LIMITS.maxKerfOffset}
                      step={0.01}
                      value={kerfOffset}
                      onChange={(e) => setKerfOffset(Number(e.target.value))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('jigsaw.random_seed.label')}</div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={randomSeed}
                        onChange={(e) => setRandomSeed(Number(e.target.value))}
                        className="flex-1 rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={handleRegenerate}
                        className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                        title={t('jigsaw.generate_new_pattern.tooltip')}
                      >
                        🎲
                      </button>
                    </div>
                  </label>
                  
                  {/* Piece Shape Difficulty */}
                  <label className="grid gap-1">
                    <div className="flex justify-between">
                      <div className="text-[11px] text-slate-400">{t('jigsaw.piece_shape_difficulty.label')}</div>
                      <div className="text-[11px] text-slate-300">{pieceDifficulty}%</div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={10}
                      value={pieceDifficulty}
                      onChange={(e) => setPieceDifficulty(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>{t('jigsaw.piece_shape_difficulty.simple')}</span>
                      <span>{t('jigsaw.piece_shape_difficulty.complex')}</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Jigsaw Generator */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">{t('jigsaw.generator.title')}</div>
                <div className="mt-3 space-y-3">
                  {/* Margin */}
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('jigsaw.generator.outer_margin.label')}</div>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={0.5}
                      value={marginMm}
                      onChange={(e) => setMarginMm(Number(e.target.value))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                    <div className="text-[10px] text-slate-500">{t('jigsaw.generator.outer_margin.helper')}</div>
                  </label>
                  
                  {/* Knob Size */}
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('jigsaw.generator.knob_size.label')}</div>
                    <input
                      type="range"
                      min={40}
                      max={90}
                      step={5}
                      value={knobSizePct}
                      onChange={(e) => setKnobSizePct(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>40%</span>
                      <span className="font-medium text-slate-300">{knobSizePct}%</span>
                      <span>90%</span>
                    </div>
                  </label>
                  
                  {/* Roundness */}
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('jigsaw.generator.knob_roundness.label')}</div>
                    <input
                      type="range"
                      min={0.6}
                      max={1.0}
                      step={0.05}
                      value={knobRoundness}
                      onChange={(e) => setKnobRoundness(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>0.6</span>
                      <span className="font-medium text-slate-300">{knobRoundness.toFixed(2)}</span>
                      <span>1.0</span>
                    </div>
                  </label>
                  
                  {/* Jitter */}
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('jigsaw.generator.jitter.label')}</div>
                    <input
                      type="range"
                      min={0}
                      max={0.35}
                      step={0.05}
                      value={knobJitter}
                      onChange={(e) => setKnobJitter(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>0</span>
                      <span className="font-medium text-slate-300">{knobJitter.toFixed(2)}</span>
                      <span>0.35</span>
                    </div>
                  </label>
                  
                  {/* Clearance */}
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('jigsaw.generator.clearance.label')}</div>
                    <input
                      type="number"
                      min={-0.2}
                      max={0.2}
                      step={0.01}
                      value={clearanceMm}
                      onChange={(e) => setClearanceMm(Number(e.target.value))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                    <div className="text-[10px] text-slate-500">{t('jigsaw.generator.clearance.helper')}</div>
                  </label>
                </div>
              </div>

              {/* Output Options */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">{t('jigsaw.output_options.title')}</div>
                <div className="mt-3 space-y-3">
                  {/* Export Mode */}
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('jigsaw.export_mode.label')}</div>
                    <select
                      value={exportMode}
                      onChange={(e) => setExportMode(e.target.value as 'cut-lines' | 'piece-outlines')}
                      className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    >
                      <option value="cut-lines">{t('jigsaw.export_mode.cut_lines')}</option>
                      <option value="piece-outlines">{t('jigsaw.export_mode.piece_outlines')}</option>
                    </select>
                  </label>
                  
                  {/* Piece Numbering */}
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={pieceNumbering}
                      onChange={(e) => setPieceNumbering(e.target.checked)}
                      className="rounded border-slate-800"
                    />
                    <span className="text-xs text-slate-300">{t('jigsaw.piece_numbering.label')}</span>
                  </label>
                  
                  {/* Compensate Kerf */}
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={compensateKerf}
                      onChange={(e) => setCompensateKerf(e.target.checked)}
                      className="rounded border-slate-800"
                    />
                    <span className="text-xs text-slate-300">{t('jigsaw.compensate_kerf.label')}</span>
                  </label>
                  
                  {/* Show Piece IDs */}
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showPieceIds}
                      onChange={(e) => setShowPieceIds(e.target.checked)}
                      className="rounded border-slate-800"
                    />
                    <span className="text-xs text-slate-300">{t('jigsaw.show_piece_ids.label')}</span>
                  </label>
                </div>
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="rounded-lg border border-amber-800 bg-amber-950/40 p-3">
                  <div className="text-sm font-medium text-amber-300">{t('jigsaw.warnings.title')}</div>
                  <ul className="mt-2 space-y-1 text-xs text-amber-200">
                    {warnings.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Export */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">{t('jigsaw.export.title')}</div>
                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                  >
                    {t('jigsaw.export.regenerate')}
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCutOnly}
                    className="w-full rounded-md border border-sky-600 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-400 hover:bg-sky-500/20"
                  >
                    {t('jigsaw.export.cut_svg')}
                  </button>
                  <button
                    type="button"
                    onClick={handleExport}
                    className="w-full rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
                  >
                    {t('jigsaw.export.full_svg')}
                  </button>
                  <button
                    type="button"
                    onClick={handleExportProductKit}
                    className="w-full rounded-md border-2 border-purple-500 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-400 hover:bg-purple-500/20"
                  >
                    {t('jigsaw.export.product_kit_zip')}
                  </button>
                  <button
                    type="button"
                    onClick={handleAddToPriceCalculator}
                    className="w-full rounded-md border-2 border-emerald-500 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20"
                  >
                    {t('jigsaw.export.add_to_price_calculator')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Preview */}
        <section className="mt-2 flex flex-1 flex-col gap-3 md:mt-0">
          <div className="flex flex-1 flex-col rounded-lg border border-slate-800 bg-slate-900/40 p-3 md:p-4">
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-slate-100">{t('jigsaw.preview.title')}</div>
                <div className="text-[10px] text-slate-500">
                  {t('jigsaw.preview.summary')
                    .replace('{widthMm}', String(widthMm))
                    .replace('{heightMm}', String(heightMm))
                    .replace('{pieces}', String(pieceCount))}
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setPreviewZoom(Math.max(25, previewZoom - 25))}
                  className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded"
                  title={t('jigsaw.preview.zoom_out')}
                >
                  −
                </button>
                <span className="text-xs text-slate-400 min-w-[45px] text-center">
                  {previewZoom}%
                </span>
                <button
                  onClick={() => setPreviewZoom(Math.min(400, previewZoom + 25))}
                  className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded"
                  title={t('jigsaw.preview.zoom_in')}
                >
                  +
                </button>
                <button
                  onClick={() => setPreviewZoom(100)}
                  className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded"
                  title={t('jigsaw.preview.reset_zoom')}
                >
                  {t('jigsaw.preview.reset_zoom_short')}
                </button>
                <button
                  onClick={handleExport}
                  className="px-3 py-1 text-xs bg-sky-500 hover:bg-sky-600 text-white rounded font-medium"
                  title={t('jigsaw.preview.export_svg')}
                >
                  {t('jigsaw.preview.export_svg_short')}
                </button>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-center overflow-auto rounded-lg border border-slate-800 bg-white p-4 min-h-[300px]">
              {(() => {
                if (isLoadingPathOps) {
                  return (
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
                      <div className="text-sm text-slate-600">{t('jigsaw.loading_pathops')}</div>
                    </div>
                  );
                }
                
                if (pathOpsError) {
                  return (
                    <div className="flex flex-col items-center gap-2 max-w-md text-center">
                      <div className="text-red-500 text-sm font-medium">{t('jigsaw.pathops_error.title')}</div>
                      <div className="text-xs text-slate-600">{pathOpsError}</div>
                    </div>
                  );
                }
                
                if (puzzleResult && puzzleResult.fullSvg && puzzleResult.fullSvg.length > 0) {
                  // Make SVG visible for preview by increasing stroke width (laser uses 0.001mm which is invisible on screen)
                  const previewSvg = puzzleResult.fullSvg
                    .replace(/stroke-width="[^"]*"/g, 'stroke-width="0.5"')
                    .replace(/width="(\d+)mm"/g, 'width="100%"')
                    .replace(/height="(\d+)mm"/g, 'height="100%"');
                  
                  return (
                    <div 
                      className="w-full h-full flex items-center justify-center"
                      style={{ minHeight: '250px' }}
                    >
                      <div
                        style={{ 
                          transform: `scale(${previewZoom / 100})`,
                          transformOrigin: 'center center',
                          transition: 'transform 0.2s ease'
                        }}
                        dangerouslySetInnerHTML={{ __html: previewSvg }} 
                      />
                    </div>
                  );
                } else {
                  return (
                    <div className="text-sm text-slate-500">
                      {t('jigsaw.no_preview')}
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
