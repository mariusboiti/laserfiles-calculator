import { useState, useCallback, useRef, useEffect } from 'react';
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
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const resizeStartRef = useRef<{ x: number; width: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [leftPaneWidth, setLeftPaneWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 900;
    const stored = window.localStorage.getItem('panelSplitter:leftPaneWidth');
    const parsed = stored ? Number(stored) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return Math.round(Math.min(860, Math.max(440, window.innerWidth * 0.5)));
  });
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
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('panelSplitter:leftPaneWidth', String(leftPaneWidth));
  }, [leftPaneWidth]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const clampLeftPane = () => {
      const wrapper = layoutRef.current;
      if (!wrapper) return;

      const rect = wrapper.getBoundingClientRect();
      const minLeft = 420;
      const minRight = 520;
      const maxLeft = Math.max(minLeft, rect.width - minRight - 12);

      if (leftPaneWidth > maxLeft) {
        setLeftPaneWidth(Math.round(maxLeft));
      }
    };

    clampLeftPane();
    window.addEventListener('resize', clampLeftPane);
    return () => window.removeEventListener('resize', clampLeftPane);
  }, [leftPaneWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const onMove = (e: MouseEvent) => {
      const start = resizeStartRef.current;
      const wrapper = layoutRef.current;
      if (!start || !wrapper) return;

      const rect = wrapper.getBoundingClientRect();
      const minLeft = 420;
      const minRight = 520;
      const maxLeft = Math.max(minLeft, rect.width - minRight - 12);
      const next = start.width + (e.clientX - start.x);
      setLeftPaneWidth(Math.max(minLeft, Math.min(maxLeft, Math.round(next))));
    };

    const onUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isResizing]);

  useEffect(() => {
    const errors = validateSettings(settings);
    setValidationErrors(errors);

    if (svgInfo && errors.length === 0) {
      try {
        const grid = computeGrid(svgInfo.detectedWidthMm, svgInfo.detectedHeightMm, settings);
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
    } else if (!svgInfo) {
      setGridInfo(null);
    }
  }, [svgInfo, settings]);

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
    if (!svgInfo || !gridInfo || validationErrors.length > 0) return;

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
        svgInfo,
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
  }, [svgInfo, gridInfo, settings, validationErrors]);

  const handleCancel = useCallback(() => {
    cancelRef.current = true;
    setProcessingState(prev => ({ ...prev, phase: 'cancelled' }));
  }, []);

  const handleExport = useCallback(async () => {
    if (!svgInfo || !gridInfo || processedTiles.length === 0) return;

    setProcessingState(prev => ({ ...prev, isProcessing: true, phase: 'exporting' }));

    try {
      await exportToZip({
        svgInfo,
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
  }, [svgInfo, gridInfo, settings, processedTiles]);

  const canGenerate = svgInfo !== null && gridInfo !== null && validationErrors.length === 0 && !processingState.isProcessing;

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
  if (svgInfo && settings.bedWidth < svgInfo.detectedWidthMm && settings.bedHeight < svgInfo.detectedHeightMm) {
    warnings.push('Source SVG exceeds laser bed size');
  }

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
              svgInfo={svgInfo}
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
          <Settings
            settings={settings}
            onChange={setSettings}
            errors={validationErrors}
          />
        </div>

        {/* Desktop: sticky left pane + resizable splitter + scrollable right pane */}
        <div ref={layoutRef} className="hidden lg:flex gap-4">
          <div
            className="sticky top-4 self-start"
            style={{ width: leftPaneWidth, height: 'calc(100vh - 140px)' }}
          >
            <div className="h-full flex flex-col gap-4">
              <div className="flex-1 min-h-[360px]">
                <PreviewCanvas
                  svgInfo={svgInfo}
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
          </div>

          <div
            className={`w-2 -mx-1 cursor-col-resize rounded hover:bg-gray-300/60 ${isResizing ? 'bg-gray-300/80' : 'bg-transparent'}`}
            onMouseDown={(e) => {
              e.preventDefault();
              resizeStartRef.current = { x: e.clientX, width: leftPaneWidth };
              setIsResizing(true);
            }}
            title="Drag to resize"
          />

          <div className="flex-1 space-y-4">
            <Uploader
              onSVGLoaded={handleSVGLoaded}
              unitMode={settings.unitMode}
              onUnitModeChange={handleUnitModeChange}
              svgInfo={svgInfo}
            />
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
