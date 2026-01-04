import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Uploader } from './components/Uploader';
import { Settings } from './components/Settings';
import { PreviewCanvas } from './components/PreviewCanvas';
import { TileList } from './components/TileList';
import { ExportBar } from './components/ExportBar';
import { parseSVG } from './lib/svg/parser';
import { computeGrid } from './lib/svg/grid';
import { processTiles } from './lib/svg/tiler';
import { exportToZip } from './lib/svg/export';
import { DEFAULTS, sanitizeBedDimensions, sanitizeMarginOverlap, BED_PRESETS } from '../config/defaults';
import {
  SVGInfo,
  Settings as SettingsType,
  GridInfo,
  TileInfo,
  ProcessingState,
  ValidationError,
  UnitMode,
} from './types';

interface AppProps {
  onResetCallback?: (callback: () => void) => void;
}

const DEFAULT_SETTINGS: SettingsType = {
  bedWidth: DEFAULTS.bedW,
  bedHeight: DEFAULTS.bedH,
  margin: DEFAULTS.margin,
  overlap: DEFAULTS.overlap,
  tileOffsetX: 0,
  tileOffsetY: 0,
  unitSystem: 'mm',
  exportMode: 'laser-safe',
  numberingEnabled: true,
  numberingFormat: 'panel_{row}{col}',
  startIndexAtOne: true,
  guidesEnabled: false,
  boundaryRectEnabled: false,
  expandStrokes: false,
  simplifyTolerance: 0,
  exportEmptyTiles: false,
  unitMode: 'auto',
  registrationMarks: {
    enabled: false,
    type: 'crosshair',
    placement: 'inside',
    size: 6,
    strokeWidth: 0.2,
    holeDiameter: 2,
  },
  assemblyMap: {
    enabled: true,
    includeLabels: true,
    includeThumbnails: false,
  },
};

function validateSettings(settings: SettingsType): ValidationError[] {
  const errors: ValidationError[] = [];

  if (settings.bedWidth < 10) {
    errors.push({ field: 'bedWidth', message: 'Bed width must be at least 10mm' });
  }
  if (settings.bedHeight < 10) {
    errors.push({ field: 'bedHeight', message: 'Bed height must be at least 10mm' });
  }
  if (settings.margin < 0) {
    errors.push({ field: 'margin', message: 'Margin cannot be negative' });
  }
  if (settings.overlap < 0) {
    errors.push({ field: 'overlap', message: 'Overlap cannot be negative' });
  }

  const effectiveWidth = settings.bedWidth - 2 * settings.margin;
  const effectiveHeight = settings.bedHeight - 2 * settings.margin;

  if (effectiveWidth <= 0) {
    errors.push({ field: 'margin', message: 'Margin too large for bed width' });
  }
  if (effectiveHeight <= 0) {
    errors.push({ field: 'margin', message: 'Margin too large for bed height' });
  }
  if (settings.overlap >= effectiveWidth) {
    errors.push({ field: 'overlap', message: 'Overlap must be less than effective tile width' });
  }
  if (settings.overlap >= effectiveHeight) {
    errors.push({ field: 'overlap', message: 'Overlap must be less than effective tile height' });
  }

  return errors;
}

export default function App({ onResetCallback }: AppProps) {
  const [svgInfo, setSvgInfo] = useState<SVGInfo | null>(null);
  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS);
  const [gridInfo, setGridInfo] = useState<GridInfo | null>(null);
  const [selectedTile, setSelectedTile] = useState<TileInfo | null>(null);
  const [processedTiles, setProcessedTiles] = useState<TileInfo[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [outputSize, setOutputSize] = useState<{ widthMm: number; heightMm: number; lockAspect: boolean } | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    currentTile: 0,
    totalTiles: 0,
    phase: 'idle',
    error: null,
  });

  const cancelRef = useRef(false);

  const resetToDefaults = useCallback(() => {
    setSvgInfo(null);
    setSettings(DEFAULT_SETTINGS);
    setGridInfo(null);
    setSelectedTile(null);
    setProcessedTiles([]);
    setValidationErrors([]);
    setOutputSize(null);
    setProcessingState({
      isProcessing: false,
      currentTile: 0,
      totalTiles: 0,
      phase: 'idle',
      error: null,
    });
  }, []);

  // Register reset callback with parent
  useEffect(() => {
    if (onResetCallback) {
      onResetCallback(resetToDefaults);
    }
  }, [onResetCallback, resetToDefaults]);

  useEffect(() => {
    if (!svgInfo) {
      setOutputSize(null);
      return;
    }
    setOutputSize({ widthMm: svgInfo.detectedWidthMm, heightMm: svgInfo.detectedHeightMm, lockAspect: true });
  }, [svgInfo]);

  const effectiveSvgInfo: SVGInfo | null = useMemo(() => {
    if (!svgInfo || !outputSize) return svgInfo;
    return { ...svgInfo, detectedWidthMm: outputSize.widthMm, detectedHeightMm: outputSize.heightMm };
  }, [svgInfo, outputSize?.widthMm, outputSize?.heightMm]);

  useEffect(() => {
    const errors = validateSettings(settings);
    setValidationErrors(errors);

    if (effectiveSvgInfo && errors.length === 0) {
      try {
        const grid = computeGrid(effectiveSvgInfo.detectedWidthMm, effectiveSvgInfo.detectedHeightMm, settings);
        setGridInfo(grid);
        setProcessedTiles([]);
        setSelectedTile(null);
      } catch (err) {
        setGridInfo(null);
        setValidationErrors([{
          field: 'general',
          message: err instanceof Error ? err.message : 'Failed to compute grid',
        }]);
      }
    } else if (!effectiveSvgInfo) {
      setGridInfo(null);
    }
  }, [effectiveSvgInfo, settings]);

  const handleSVGLoaded = useCallback((info: SVGInfo) => {
    setSvgInfo(info);
    setProcessedTiles([]);
    setSelectedTile(null);
    setProcessingState(prev => ({ ...prev, error: null, phase: 'idle' }));
  }, []);

  const handleUnitModeChange = useCallback((mode: UnitMode) => {
    setSettings(prev => ({ ...prev, unitMode: mode }));
    
    if (svgInfo) {
      try {
        const reparsed = parseSVG(svgInfo.originalContent, svgInfo.fileName, mode);
        setSvgInfo(reparsed);
      } catch (err) {
        console.error('Failed to reparse SVG with new unit mode:', err);
      }
    }
  }, [svgInfo]);

  const handleGenerate = useCallback(async () => {
    if (!effectiveSvgInfo || !gridInfo || validationErrors.length > 0) return;

    cancelRef.current = false;
    setProcessingState({
      isProcessing: true,
      currentTile: 0,
      totalTiles: gridInfo.tiles.length,
      phase: 'preparing',
      error: null,
    });

    try {
      setProcessingState(prev => ({ ...prev, phase: 'tiling' }));

      const results = await processTiles(
        effectiveSvgInfo,
        gridInfo,
        settings,
        (current, total) => {
          setProcessingState(prev => ({
            ...prev,
            currentTile: current,
            totalTiles: total,
          }));
        },
        () => cancelRef.current
      );

      const updatedTiles = gridInfo.tiles.map(tile => {
        const result = results.find(r => r.tile.id === tile.id);
        return result ? result.tile : { ...tile, isEmpty: true };
      });

      setProcessedTiles(updatedTiles);
      setGridInfo(prev => prev ? { ...prev, tiles: updatedTiles } : null);
      setProcessingState({
        isProcessing: false,
        currentTile: gridInfo.tiles.length,
        totalTiles: gridInfo.tiles.length,
        phase: 'done',
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Processing failed';
      setProcessingState({
        isProcessing: false,
        currentTile: 0,
        totalTiles: 0,
        phase: 'idle',
        error: message === 'Processing cancelled' ? null : message,
      });
    }
  }, [effectiveSvgInfo, gridInfo, settings, validationErrors]);

  const handleCancel = useCallback(() => {
    cancelRef.current = true;
    setProcessingState(prev => ({ ...prev, phase: 'cancelled' }));
  }, []);

  const handleExport = useCallback(async () => {
    if (!effectiveSvgInfo || !gridInfo || processedTiles.length === 0) return;

    setProcessingState(prev => ({ ...prev, isProcessing: true, phase: 'exporting' }));

    try {
      await exportToZip({
        svgInfo: effectiveSvgInfo,
        settings,
        gridInfo,
        tiles: processedTiles,
      });

      setProcessingState(prev => ({ ...prev, isProcessing: false, phase: 'done' }));
    } catch (err) {
      setProcessingState(prev => ({
        ...prev,
        isProcessing: false,
        phase: 'idle',
        error: err instanceof Error ? err.message : 'Export failed',
      }));
    }
  }, [effectiveSvgInfo, gridInfo, settings, processedTiles]);

  const canGenerate = effectiveSvgInfo !== null && gridInfo !== null && validationErrors.length === 0 && !processingState.isProcessing;

  // Generate warnings
  const warnings: string[] = [];
  if (gridInfo) {
    if (gridInfo.tiles.length > 100) {
      warnings.push('More than 100 tiles generated – heavy job');
    }
    if (settings.overlap > settings.margin) {
      warnings.push('Overlap larger than margin may duplicate cuts');
    }
  }
  if (effectiveSvgInfo && settings.bedWidth < effectiveSvgInfo.detectedWidthMm && settings.bedHeight < effectiveSvgInfo.detectedHeightMm) {
    warnings.push('Source SVG exceeds laser bed size');
  }

  const outputAspect = outputSize && outputSize.heightMm > 0 ? outputSize.widthMm / outputSize.heightMm : 1;

  const updateOutputSize = (next: Partial<{ widthMm: number; heightMm: number; lockAspect: boolean }>) => {
    if (!svgInfo || !outputSize) return;
    const merged = { ...outputSize, ...next };
    const w = Math.max(1, Number(merged.widthMm));
    const h = Math.max(1, Number(merged.heightMm));

    if (merged.lockAspect) {
      if (next.widthMm !== undefined && outputAspect > 0) {
        setOutputSize({ ...merged, widthMm: w, heightMm: Math.max(1, w / outputAspect) });
        return;
      }
      if (next.heightMm !== undefined && outputAspect > 0) {
        setOutputSize({ ...merged, widthMm: Math.max(1, h * outputAspect), heightMm: h });
        return;
      }
    }

    setOutputSize({ ...merged, widthMm: w, heightMm: h });
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/60">
        <div className="max-w-screen-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8" viewBox="0 0 100 100">
              <rect x="5" y="5" width="40" height="40" fill="#0ea5e9" rx="4"/>
              <rect x="55" y="5" width="40" height="40" fill="#38bdf8" rx="4"/>
              <rect x="5" y="55" width="40" height="40" fill="#38bdf8" rx="4"/>
              <rect x="55" y="55" width="40" height="40" fill="#0ea5e9" rx="4"/>
            </svg>
            <div>
              <h1 className="text-xl font-bold text-slate-100">Panel Splitter</h1>
              <p className="text-sm text-slate-400">LaserFilesPro</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto p-4">
        {/* Warnings Display */}
        {warnings.length > 0 && (
          <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-amber-400">Warnings</h3>
                <ul className="mt-1 text-sm text-amber-300 space-y-1">
                  {warnings.map((warning, i) => (
                    <li key={i}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Mobile / small screens: stacked */}
        <div className="grid grid-cols-1 gap-4 lg:hidden">
          <div className="h-[500px]">
            <PreviewCanvas
              svgInfo={effectiveSvgInfo}
              gridInfo={gridInfo}
              selectedTile={selectedTile}
              onTileSelect={setSelectedTile}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TileList
              gridInfo={gridInfo}
              selectedTile={selectedTile}
              onTileSelect={setSelectedTile}
            />
            <ExportBar
              gridInfo={gridInfo}
              processingState={processingState}
              processedTiles={processedTiles}
              onGenerate={handleGenerate}
              onCancel={handleCancel}
              onExport={handleExport}
              canGenerate={canGenerate}
            />
          </div>
          <Uploader
            onSVGLoaded={handleSVGLoaded}
            unitMode={settings.unitMode}
            onUnitModeChange={handleUnitModeChange}
            svgInfo={svgInfo}
          />
          {svgInfo && outputSize && (
            <div className="card">
              <h2 className="text-lg font-semibold text-slate-100 mb-3">Output Size</h2>
              <p className="text-xs text-slate-400 mb-3">Scales the design in mm before tiling/export.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-200">Width (mm)</label>
                  <input
                    type="number"
                    value={Number(outputSize.widthMm.toFixed(3))}
                    min={1}
                    step={0.5}
                    onChange={(e) => updateOutputSize({ widthMm: Number(e.target.value) || 1 })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-200">Height (mm)</label>
                  <input
                    type="number"
                    value={Number(outputSize.heightMm.toFixed(3))}
                    min={1}
                    step={0.5}
                    onChange={(e) => updateOutputSize({ heightMm: Number(e.target.value) || 1 })}
                    className="input-field"
                  />
                </div>
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={outputSize.lockAspect}
                  onChange={(e) => updateOutputSize({ lockAspect: e.target.checked })}
                  className="w-4 h-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950 rounded"
                />
                Lock aspect
              </label>
            </div>
          )}
          <Settings
            settings={settings}
            onChange={setSettings}
            errors={validationErrors}
          />
        </div>

        {/* Desktop: flexible preview + fixed-width sidebar */}
        <div className="hidden lg:flex gap-4 items-start">
          <div className="flex-1 min-w-0 space-y-4">
            <div style={{ height: 'calc(100vh - 140px)' }}>
              <PreviewCanvas
                svgInfo={effectiveSvgInfo}
                gridInfo={gridInfo}
                selectedTile={selectedTile}
                onTileSelect={setSelectedTile}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TileList
                gridInfo={gridInfo}
                selectedTile={selectedTile}
                onTileSelect={setSelectedTile}
              />
              <ExportBar
                gridInfo={gridInfo}
                processingState={processingState}
                processedTiles={processedTiles}
                onGenerate={handleGenerate}
                onCancel={handleCancel}
                onExport={handleExport}
                canGenerate={canGenerate}
              />
            </div>
          </div>

          <div className="w-full max-w-[380px] min-w-[340px] shrink-0 space-y-4 sticky top-4">
            <Uploader
              onSVGLoaded={handleSVGLoaded}
              unitMode={settings.unitMode}
              onUnitModeChange={handleUnitModeChange}
              svgInfo={svgInfo}
            />
            {svgInfo && outputSize && (
              <div className="card">
                <h2 className="text-lg font-semibold text-slate-100 mb-3">Output Size</h2>
                <p className="text-xs text-slate-400 mb-3">Scales the design in mm before tiling/export.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-200">Width (mm)</label>
                    <input
                      type="number"
                      value={Number(outputSize.widthMm.toFixed(3))}
                      min={1}
                      step={0.5}
                      onChange={(e) => updateOutputSize({ widthMm: Number(e.target.value) || 1 })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-200">Height (mm)</label>
                    <input
                      type="number"
                      value={Number(outputSize.heightMm.toFixed(3))}
                      min={1}
                      step={0.5}
                      onChange={(e) => updateOutputSize({ heightMm: Number(e.target.value) || 1 })}
                      className="input-field"
                    />
                  </div>
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={outputSize.lockAspect}
                    onChange={(e) => updateOutputSize({ lockAspect: e.target.checked })}
                    className="w-4 h-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950 rounded"
                  />
                  Lock aspect
                </label>
              </div>
            )}
            <Settings
              settings={settings}
              onChange={setSettings}
              errors={validationErrors}
            />
          </div>
        </div>
      </main>

      <footer className="mt-8 py-4 border-t border-gray-200 bg-white">
        <div className="max-w-screen-2xl mx-auto px-4 text-center text-sm text-gray-500">
          Panel Splitter by LaserFilesPro • Client-side SVG tiling for laser cutters
        </div>
      </footer>
    </div>
  );
}
