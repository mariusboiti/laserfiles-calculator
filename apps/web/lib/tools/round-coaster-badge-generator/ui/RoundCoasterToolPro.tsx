'use client';

import React, { useReducer, useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  RotateCcw, ZoomIn, ZoomOut, Maximize2,
  Undo2, Redo2, Layers, Eye, EyeOff, ChevronDown, ChevronUp,
  Type, Circle, Hexagon, Shield, Octagon, Sparkles,
  Wand2, Image, Flower2, AlignCenter
} from 'lucide-react';

import { jobManager } from '../../../jobs/jobManager';

import type { CanvasDocument, ViewTransform, HistoryState } from '../types/canvas';
import { DEFAULT_VIEW, DEFAULT_SELECTION } from '../types/canvas';
import {
  canvasReducer,
  createInitialHistory,
  canUndo,
  canRedo,
} from '../core/canvas/canvasReducer';
import { createCoasterDocument, createOrnamentElement, createTracedElement, createLogoElement } from '../core/canvas/elements';
import { fitToContainer } from '../core/canvas/coords';
import type { ShapeType } from '../core/canvas/shapes';
import { CanvasStage } from './components/CanvasStage';
import { buildExportSvgAsync } from '../core/exportSvg';
import { ensureFontsLoaded, getCssFontFamily } from '@/lib/fonts/fontLoader';
import { loadFont } from '@/lib/fonts/sharedFontRegistry';
import { generateCurvedTextPath } from '../core/canvas/curvedText';
import { ExportMiniDisclaimer } from '@/components/legal';

// New panel components
import { FontPicker } from './components/FontPicker';
import { CurvedTextControls, DEFAULT_CURVED_TEXT_CONFIG, type CurvedTextConfig } from './components/CurvedTextControls';
import { AlignmentControls, type AlignmentAction } from './components/AlignmentControls';
import { PathfinderPanel, type PathfinderOperation } from './components/PathfinderPanel';
import { AIGeneratePanel } from './components/AIGeneratePanel';
import { ImageTracePanel, type TraceOptions } from './components/ImageTracePanel';
import { OrnamentLibrary, type OrnamentAsset } from './components/OrnamentLibrary';
import type { FontId } from '../../../fonts/sharedFontRegistry';

import { useOpenTraceAndInsertLogo } from './hooks/useOpenTraceAndInsertLogo';
import { sanitizeTracedPaths } from '../core/trace/sanitizeTracedPaths';
import { showToast } from './toast';
import type { TraceModalResult } from '@/components/trace/TraceModal';

// ============ UI Components ============

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <span className="text-sm font-medium text-slate-100">{title}</span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {isOpen && <div className="px-3 pb-3 space-y-3">{children}</div>}
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = 'mm',
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));

  return (
    <label className="grid gap-1">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(clamp(value - step))}
          disabled={disabled || value <= min}
          className="px-2 py-1 bg-slate-800 rounded text-xs hover:bg-slate-700 disabled:opacity-50"
        >
          −
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          className="w-16 text-center rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-100"
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + step))}
          disabled={disabled || value >= max}
          className="px-2 py-1 bg-slate-800 rounded text-xs hover:bg-slate-700 disabled:opacity-50"
        >
          +
        </button>
        <span className="text-[10px] text-slate-500">{unit}</span>
      </div>
    </label>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-slate-700 bg-slate-900"
      />
      <span className="text-xs text-slate-300">{label}</span>
    </label>
  );
}

// ============ Shape Icons ============
const SHAPE_ICONS: Record<ShapeType, React.ElementType> = {
  circle: Circle,
  hex: Hexagon,
  octagon: Octagon,
  scalloped: Sparkles,
  shield: Shield,
};

// ============ Presets ============
const DIAMETER_PRESETS = [60, 70, 80, 90, 100];

interface QuickPreset {
  id: string;
  name: string;
  shape: ShapeType;
  diameter: number;
  width?: number;
  height?: number;
  text: string;
}

const QUICK_PRESETS: QuickPreset[] = [
  { id: 'coaster-90', name: 'Coaster 90mm', shape: 'circle', diameter: 90, text: 'COASTER' },
  { id: 'coaster-100', name: 'Coaster 100mm', shape: 'circle', diameter: 100, text: 'COASTER' },
  { id: 'badge-60', name: 'Badge 60mm', shape: 'circle', diameter: 60, text: 'NAME' },
  { id: 'badge-70', name: 'Badge 70mm', shape: 'circle', diameter: 70, text: 'NAME' },
  { id: 'hex-90', name: 'Hex 90mm', shape: 'hex', diameter: 90, text: 'HEX' },
  { id: 'shield-80', name: 'Shield', shape: 'shield', diameter: 80, width: 80, height: 92, text: 'BADGE' },
];

// ============ Main Component ============

interface RoundCoasterToolProProps {
  onResetCallback?: (callback: () => void) => void;
  onGetExportPayload?: (
    getExportPayload: () => Promise<{ svg: string; name?: string; meta?: any }> | { svg: string; name?: string; meta?: any }
  ) => void;
}

export function RoundCoasterToolPro({ onResetCallback, onGetExportPayload }: RoundCoasterToolProProps) {
  // Canvas state with history
  const [history, dispatch] = useReducer(
    canvasReducer,
    createCoasterDocument('circle', 90, undefined, undefined, 'COASTER'),
    createInitialHistory
  );

  // View state
  const [view, setView] = useState<ViewTransform>(DEFAULT_VIEW);

  // UI state
  const [showLayerColors, setShowLayerColors] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [stepSize, setStepSize] = useState(1);

  // Current document
  const doc = history.present.doc;
  const selection = history.present.selection;

  const preservedElementsRef = useRef<typeof doc.elements>([]);
  useEffect(() => {
    preservedElementsRef.current = doc.elements.filter((e: any) => e?.system !== true);
  }, [doc.elements]);

  // Shape and dimension state (derived from artboard)
  const [shape, setShape] = useState<ShapeType>(doc.artboard.shapeType);
  const [diameter, setDiameter] = useState(doc.artboard.widthMm);
  const [width, setWidth] = useState(doc.artboard.widthMm);
  const [height, setHeight] = useState(doc.artboard.heightMm);

  // Text state
  const [centerText, setCenterText] = useState('COASTER');
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [uppercase, setUppercase] = useState(false);

  const [centerFontSizeMm, setCenterFontSizeMm] = useState(16);
  const [topFontSizeMm, setTopFontSizeMm] = useState(10);
  const [bottomFontSizeMm, setBottomFontSizeMm] = useState(10);

  // Border state
  const [borderEnabled, setBorderEnabled] = useState(true);
  const [borderInset, setBorderInset] = useState(3);
  const [borderThickness, setBorderThickness] = useState(0.4);
  const [doubleBorder, setDoubleBorder] = useState(false);
  const [doubleBorderGap, setDoubleBorderGap] = useState(1.2);

  // Font state
  const [fontId, setFontId] = useState<FontId>('Milkshake');

  // Curved text state
  const [topCurvedText, setTopCurvedText] = useState<CurvedTextConfig>({
    ...DEFAULT_CURVED_TEXT_CONFIG,
    text: '',
  });
  const [centerCurvedText, setCenterCurvedText] = useState<CurvedTextConfig>({
    ...DEFAULT_CURVED_TEXT_CONFIG,
    text: '',
  });
  const [bottomCurvedText, setBottomCurvedText] = useState<CurvedTextConfig>({
    ...DEFAULT_CURVED_TEXT_CONFIG,
    text: '',
  });

  useEffect(() => {
    ensureFontsLoaded([fontId, topCurvedText.fontId, centerCurvedText.fontId, bottomCurvedText.fontId]);
  }, [bottomCurvedText.fontId, centerCurvedText.fontId, fontId, topCurvedText.fontId]);

  // Active tools panel
  const [activeToolPanel, setActiveToolPanel] = useState<'none' | 'ai' | 'trace' | 'ornaments'>('none');

  const logoElements = useMemo(() => {
    return doc.elements.filter((e): e is any => e.kind === 'logo' && e.visible !== false);
  }, [doc.elements]);

  const activeLogo = logoElements[0] ?? null;

  const handleTraceLogoInsert = useCallback(
    (result: TraceModalResult) => {
      const sanitized = sanitizeTracedPaths(result.paths);
      for (const w of sanitized.warnings) {
        showToast(w, 'warning');
      }
      if (sanitized.paths.length === 0) return;

      const marginMm = 4;
      const safeW = Math.max(1, doc.artboard.widthMm - marginMm * 2);
      const safeH = Math.max(1, doc.artboard.heightMm - marginMm * 2);

      const bboxW = Math.max(0.001, result.localBounds.widthMm);
      const bboxH = Math.max(0.001, result.localBounds.heightMm);
      const fitScale = Math.min(1, 0.95 * Math.min(safeW / bboxW, safeH / bboxH));

      const cx = doc.artboard.widthMm / 2;
      const cy = doc.artboard.heightMm / 2;

      const logoEl = createLogoElement({
        paths: sanitized.paths,
        localBounds: result.localBounds,
        xMm: cx,
        yMm: cy,
        op: 'ENGRAVE',
      });
      logoEl.transform.scaleX = fitScale;
      logoEl.transform.scaleY = fitScale;

      dispatch({ type: 'ADD_ELEMENT', element: logoEl });
      dispatch({ type: 'COMMIT' });
    },
    [doc.artboard.heightMm, doc.artboard.widthMm]
  );

  const trace = useOpenTraceAndInsertLogo({
    defaultTargetWidthMm: Math.max(10, Math.min(doc.artboard.widthMm, doc.artboard.heightMm) - 8),
    onInsert: handleTraceLogoInsert,
  });

  const handleSetLogoOp = useCallback(
    (op: 'ENGRAVE' | 'CUT_OUT') => {
      if (!activeLogo) return;
      dispatch({
        type: 'UPDATE_ELEMENT',
        id: activeLogo.id,
        updates: {
          op,
          layer: op === 'CUT_OUT' ? 'CUT' : 'ENGRAVE',
        },
      });
      dispatch({ type: 'COMMIT' });
    },
    [activeLogo]
  );

  // Reset function
  const resetToDefaults = useCallback(() => {
    const newDoc = createCoasterDocument('circle', 90, undefined, undefined, 'COASTER');
    dispatch({ type: 'RESET', doc: newDoc });
    setShape('circle');
    setDiameter(90);
    setWidth(90);
    setHeight(90);
    setCenterText('COASTER');
    setTopText('');
    setBottomText('');
    setBorderEnabled(true);
    setBorderInset(3);
    setBorderThickness(0.4);
    setDoubleBorder(false);
    setDoubleBorderGap(1.2);
    setFontId('Milkshake');
    setCenterFontSizeMm(16);
    setTopFontSizeMm(10);
    setBottomFontSizeMm(10);
    setTopCurvedText({ ...DEFAULT_CURVED_TEXT_CONFIG, text: '' });
    setCenterCurvedText({ ...DEFAULT_CURVED_TEXT_CONFIG, text: '' });
    setBottomCurvedText({ ...DEFAULT_CURVED_TEXT_CONFIG, text: '' });
    setActiveToolPanel('none');
  }, []);

  // Register reset callback
  useEffect(() => {
    if (onResetCallback) {
      onResetCallback(resetToDefaults);
    }
  }, [onResetCallback, resetToDefaults]);

  // Rebuild document when shape/dimensions/border/text change
  const rebuildDocument = useCallback(async () => {
    const preserved = preservedElementsRef.current;
    const size = shape === 'shield' ? Math.max(width, height) : diameter;
    const w = shape === 'shield' ? width : undefined;
    const h = shape === 'shield' ? height : undefined;
    const text = uppercase ? centerText.toUpperCase() : centerText;
    const top = uppercase ? topText.toUpperCase() : topText;
    const bottom = uppercase ? bottomText.toUpperCase() : bottomText;

    const newDoc = createCoasterDocument(shape, size, w, h, text, {
      topText: top,
      bottomText: bottom,
      centerFontSizeMm,
      topFontSizeMm,
      bottomFontSizeMm,
      border: {
        enabled: borderEnabled,
        inset: borderInset,
        thickness: borderThickness,
        doubleBorder,
        doubleBorderGap,
      },
    });

    // Preserve any user-inserted elements (logos, ornaments, traces etc)
    if (preserved.length > 0) {
      newDoc.elements.push(...preserved);
    }

    const cx = newDoc.artboard.widthMm / 2;
    const cy = newDoc.artboard.heightMm / 2;
    const baseRadius = Math.min(newDoc.artboard.widthMm, newDoc.artboard.heightMm) / 2;

    const buildCurved = async (
      position: 'top' | 'center' | 'bottom',
      cfg: CurvedTextConfig,
      content: string
    ) => {
      const arcText = (content || '').trim();
      if (!cfg.enabled || !arcText) return null;
      try {
        const font = await loadFont(String(cfg.fontId));
        const radiusMm = baseRadius * (cfg.radius / 100);
        const { pathD, boundingRadius } = await generateCurvedTextPath(font as any, {
          text: arcText,
          radius: radiusMm,
          startAngle: cfg.startAngle,
          fontSize: cfg.fontSize,
          letterSpacing: cfg.letterSpacing,
          position: position === 'bottom' ? 'bottom' : 'top',
          flip: cfg.flip,
        });

        if (!pathD) return null;
        const el = createTracedElement(pathD, boundingRadius * 2, boundingRadius * 2, cx, cy, 'ENGRAVE');
        el.system = true;
        el.name = position === 'top' ? 'Top Curved Text' : position === 'bottom' ? 'Bottom Curved Text' : 'Center Curved Text';
        return el;
      } catch (err) {
        console.warn('Curved text generation failed', position, err);
        return null;
      }
    };

    const curvedTop = await buildCurved('top', topCurvedText, top);
    const curvedCenter = await buildCurved('center', centerCurvedText, text);
    const curvedBottom = await buildCurved('bottom', bottomCurvedText, bottom);

    const removeSystemTextByName = (name: string) => {
      newDoc.elements = newDoc.elements.filter((e: any) => !(e.kind === 'text' && e.system === true && e.name === name));
    };

    if (curvedTop) {
      removeSystemTextByName('Top Text');
      newDoc.elements.push(curvedTop);
    }
    if (curvedCenter) {
      removeSystemTextByName('Center Text');
      newDoc.elements.push(curvedCenter);
    }
    if (curvedBottom) {
      removeSystemTextByName('Bottom Text');
      newDoc.elements.push(curvedBottom);
    }

    // Ensure any text elements use the selected font
    const cssFont = getCssFontFamily(fontId);
    newDoc.elements = newDoc.elements.map((el: any) => {
      if (el.kind !== 'text') return el;
      return { ...el, fontId, fontFamily: cssFont };
    });

    dispatch({ type: 'RESET', doc: newDoc });
  }, [bottomCurvedText, borderEnabled, borderInset, borderThickness, centerCurvedText, centerFontSizeMm, centerText, diameter, doubleBorder, doubleBorderGap, fontId, height, shape, topCurvedText, topFontSizeMm, topText, bottomFontSizeMm, bottomText, uppercase, width]);

  const handleUpdateTransforms = useCallback(
    (updates: Array<{ id: string; transform: any }>) => {
      for (const u of updates) {
        dispatch({ type: 'UPDATE_TRANSFORM', id: u.id, transform: u.transform });
      }
    },
    []
  );

  const selectedElement = useMemo(() => {
    if (!selection.activeId) return null;
    return doc.elements.find(el => el.id === selection.activeId) ?? null;
  }, [doc.elements, selection.activeId]);

  const getExportPayload = useCallback(async () => {
    // buildExportSvgAsync now produces an SVG with text converted to paths
    const svg = await buildExportSvgAsync(doc, false);
    return {
      svg,
      name: `coaster-${shape}-${Math.round(diameter)}mm`,
      meta: {
        bboxMm: { width: doc.artboard.widthMm, height: doc.artboard.heightMm },
        shape,
        diameter,
      },
    };
  }, [diameter, doc, shape]);

  useEffect(() => {
    onGetExportPayload?.(getExportPayload);
  }, [getExportPayload, onGetExportPayload]);

  // Debounced rebuild
  useEffect(() => {
    const timer = setTimeout(() => {
      void rebuildDocument();
    }, 150);
    return () => clearTimeout(timer);
  }, [rebuildDocument]);

  // Handlers
  const handleShapeChange = useCallback((newShape: ShapeType) => {
    setShape(newShape);
    if (newShape === 'shield') {
      setWidth(80);
      setHeight(92);
    }
  }, []);

  const handleDiameterPreset = useCallback((d: number) => {
    setDiameter(d);
  }, []);

  const handleQuickPreset = useCallback((preset: QuickPreset) => {
    setShape(preset.shape);
    setDiameter(preset.diameter);
    if (preset.width) setWidth(preset.width);
    if (preset.height) setHeight(preset.height);
    setCenterText(preset.text);
  }, []);

  const handleSelect = useCallback((ids: string[], additive?: boolean) => {
    dispatch({ type: 'SELECT', ids, additive });
  }, []);

  const handleClearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  const handleUpdateTransform = useCallback((id: string, deltaX: number, deltaY: number) => {
    const element = doc.elements.find(el => el.id === id);
    if (element) {
      dispatch({
        type: 'UPDATE_TRANSFORM',
        id,
        transform: {
          xMm: element.transform.xMm + deltaX,
          yMm: element.transform.yMm + deltaY,
        },
      });
    }
  }, [doc.elements]);

  const handleCommit = useCallback(() => {
    dispatch({ type: 'COMMIT' });
  }, []);

  const handleUndo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const handleRedo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const handleZoomIn = useCallback(() => {
    setView(v => ({ ...v, zoom: Math.min(4, v.zoom * 1.25) }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setView(v => ({ ...v, zoom: Math.max(0.25, v.zoom / 1.25) }));
  }, []);

  const handleZoomFit = useCallback(() => {
    setView(v => ({ ...v, zoom: 1 }));
  }, []);

  // Alignment handler
  const handleAlignment = useCallback((action: AlignmentAction) => {
    const cx = doc.artboard.widthMm / 2;
    const cy = doc.artboard.heightMm / 2;
    
    selection.selectedIds.forEach(id => {
      const el = doc.elements.find(e => e.id === id);
      if (!el) return;

      let newX = el.transform.xMm;
      let newY = el.transform.yMm;

      switch (action) {
        case 'center-artboard':
        case 'align-center-h':
          newX = cx;
          break;
        case 'align-center-v':
          newY = cy;
          break;
      }

      if (newX !== el.transform.xMm || newY !== el.transform.yMm) {
        dispatch({
          type: 'UPDATE_TRANSFORM',
          id,
          transform: { xMm: newX, yMm: newY },
        });
      }
    });
    dispatch({ type: 'COMMIT' });
  }, [doc, selection.selectedIds]);

  // Pathfinder handler (stub - would use PathOps WASM)
  const handlePathfinder = useCallback(async (op: PathfinderOperation) => {
    console.log('Pathfinder operation:', op, 'on', selection.selectedIds);
    // TODO: Implement with PathOps WASM
  }, [selection.selectedIds]);

  // AI Generation handler (stub)
  const handleAIGenerate = useCallback(async (prompt: string) => {
    console.log('AI Generate:', prompt);
    // TODO: Implement AI generation API call
    return null;
  }, []);

  // AI Insert handler
  const handleAIInsert = useCallback((pathD: string, prompt: string) => {
    const cx = doc.artboard.widthMm / 2;
    const cy = doc.artboard.heightMm / 2;
    const tracedEl = createTracedElement(pathD, 30, 30, cx, cy, 'ENGRAVE', prompt);
    dispatch({ type: 'ADD_ELEMENT', element: tracedEl });
    dispatch({ type: 'COMMIT' });
  }, [doc.artboard]);

  // Image Trace handler (legacy panel) - uses existing Potrace route
  const handleImageTrace = useCallback(async (imageDataUrl: string, options: TraceOptions) => {
    const res = await jobManager.runJob({
      id: 'round-coaster-image-trace',
      label: 'Tracing image',
      fn: async (signal) => {
        const r = await fetch('/api/trace/potrace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataUrl: imageDataUrl,
            mode: 'CUT_SILHOUETTE',
            targetWidthMm: doc.artboard.widthMm,
            targetHeightMm: doc.artboard.heightMm,
            threshold: options.threshold,
            invert: options.invert,
            optTolerance: options.smoothing / 2,
            autoInvert: false,
          }),
          signal,
        });
        return (await r.json()) as any;
      },
      timeoutMs: 60000,
    });

    if (!res.ok || !res.data) return null;
    if (!res.data.ok) return null;
    return String(res.data.combinedPath || '');
  }, [doc.artboard.widthMm, doc.artboard.heightMm]);

  // Traced Insert handler
  const handleTracedInsert = useCallback((pathD: string) => {
    const cx = doc.artboard.widthMm / 2;
    const cy = doc.artboard.heightMm / 2;
    const tracedEl = createTracedElement(pathD, 30, 30, cx, cy, 'ENGRAVE');
    dispatch({ type: 'ADD_ELEMENT', element: tracedEl });
    dispatch({ type: 'COMMIT' });
  }, [doc.artboard]);

  // Ornament Insert handler
  const handleOrnamentInsert = useCallback((ornament: OrnamentAsset) => {
    const cx = doc.artboard.widthMm / 2;
    const cy = doc.artboard.heightMm / 2;
    const ornamentEl = createOrnamentElement(ornament.id, ornament.pathD, 20, 20, cx, cy, 'ENGRAVE');
    dispatch({ type: 'ADD_ELEMENT', element: ornamentEl });
    dispatch({ type: 'COMMIT' });
  }, [doc.artboard]);

  const isShield = shape === 'shield';
  const selectionCount = selection.selectedIds.length;

  return (
    <div className="lfs-tool bg-slate-950 text-slate-100">
      {trace.TraceModal}

      <div className="grid w-full grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[360px_1fr]">
        {/* Left Panel: Insert + Settings */}
        <aside className="max-h-[calc(100vh-160px)] overflow-y-auto space-y-3 pr-1">

            {/* Quick Presets */}
            <Section title="Quick Presets">
              <div className="flex flex-wrap gap-2">
                {QUICK_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleQuickPreset(preset)}
                    className="px-2.5 py-1.5 text-[11px] border border-slate-700 bg-slate-900 rounded hover:bg-slate-800 hover:border-slate-600"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </Section>

            {/* Selection */}
            <Section title="Selection" defaultOpen={false}>
              {selectedElement ? (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400">{selectedElement.name || selectedElement.kind}</div>
                  <NumberInput
                    label="Scale X"
                    value={selectedElement.transform.scaleX}
                    onChange={(v) => dispatch({ type: 'UPDATE_TRANSFORM', id: selectedElement.id, transform: { scaleX: v } })}
                    min={0.1}
                    max={10}
                    step={0.1}
                    unit="×"
                  />
                  <NumberInput
                    label="Scale Y"
                    value={selectedElement.transform.scaleY}
                    onChange={(v) => dispatch({ type: 'UPDATE_TRANSFORM', id: selectedElement.id, transform: { scaleY: v } })}
                    min={0.1}
                    max={10}
                    step={0.1}
                    unit="×"
                  />
                  {selectedElement.kind === 'text' && (
                    <NumberInput
                      label="Font size"
                      value={(selectedElement as any).fontSizeMm}
                      onChange={(v) => dispatch({ type: 'UPDATE_ELEMENT', id: selectedElement.id, updates: { fontSizeMm: v } })}
                      min={3}
                      max={60}
                      step={0.5}
                    />
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500">Select an element to edit size.</div>
              )}
            </Section>

            {activeLogo && (
              <Section title="Logo" defaultOpen={false}>
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-400">Logo operation</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSetLogoOp('ENGRAVE')}
                      className={`flex-1 px-2 py-1.5 rounded text-xs border ${activeLogo.op === 'ENGRAVE' ? 'bg-sky-600 border-sky-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'}`}
                    >
                      Engrave
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetLogoOp('CUT_OUT')}
                      className={`flex-1 px-2 py-1.5 rounded text-xs border ${activeLogo.op === 'CUT_OUT' ? 'bg-sky-600 border-sky-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'}`}
                    >
                      Cut out
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Cut out subtracts the logo from the base shape on export.
                  </div>
                </div>
              </Section>
            )}

            {/* Shape */}
            <Section title="Shape">
              <div className="flex flex-wrap gap-2">
                {(['circle', 'hex', 'octagon', 'scalloped', 'shield'] as ShapeType[]).map((s) => {
                  const Icon = SHAPE_ICONS[s];
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleShapeChange(s)}
                      className={`p-2.5 rounded-lg border ${shape === s
                        ? 'bg-sky-600 border-sky-500 text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                        }`}
                      title={s.charAt(0).toUpperCase() + s.slice(1)}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Dimensions */}
            <Section title="Dimensions">
              {/* Step size selector */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] text-slate-500">Step:</span>
                {[0.5, 1, 2].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStepSize(s)}
                    className={`px-2 py-0.5 text-[10px] rounded ${stepSize === s ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >
                    {s}mm
                  </button>
                ))}
              </div>

              {!isShield ? (
                <>
                  {/* Preset diameters */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {DIAMETER_PRESETS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleDiameterPreset(d)}
                        className={`px-2 py-1 text-[11px] rounded ${diameter === d ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                      >
                        {d}mm
                      </button>
                    ))}
                  </div>

                  <NumberInput
                    label="Diameter"
                    value={diameter}
                    onChange={setDiameter}
                    min={30}
                    max={300}
                    step={stepSize}
                  />
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <NumberInput
                    label="Width"
                    value={width}
                    onChange={setWidth}
                    min={30}
                    max={300}
                    step={stepSize}
                  />
                  <NumberInput
                    label="Height"
                    value={height}
                    onChange={setHeight}
                    min={40}
                    max={300}
                    step={stepSize}
                  />
                </div>
              )}
            </Section>

            {/* Border */}
            <Section title="Border">
              <Checkbox
                label="Enable border"
                checked={borderEnabled}
                onChange={setBorderEnabled}
              />

              {borderEnabled && (
                <div className="space-y-3 mt-2">
                  <NumberInput
                    label="Border inset"
                    value={borderInset}
                    onChange={setBorderInset}
                    min={1}
                    max={20}
                    step={0.5}
                  />

                  <NumberInput
                    label="Stroke thickness"
                    value={borderThickness}
                    onChange={setBorderThickness}
                    min={0.2}
                    max={1.2}
                    step={0.1}
                  />

                  <Checkbox
                    label="Double border"
                    checked={doubleBorder}
                    onChange={setDoubleBorder}
                  />

                  {doubleBorder && (
                    <NumberInput
                      label="Double border gap"
                      value={doubleBorderGap}
                      onChange={setDoubleBorderGap}
                      min={0.8}
                      max={2.5}
                      step={0.1}
                    />
                  )}
                </div>
              )}
            </Section>

            {/* Text */}
            <Section title="Text">
              <div className="space-y-3">
                <FontPicker
                  value={fontId}
                  onChange={setFontId}
                  label="Font"
                />

                <label className="grid gap-1">
                  <div className="text-[11px] text-slate-400">Center text</div>
                  <input
                    type="text"
                    value={centerText}
                    onChange={(e) => setCenterText(e.target.value)}
                    placeholder="Main text"
                    className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs"
                  />
                </label>

                <NumberInput
                  label="Center size"
                  value={centerFontSizeMm}
                  onChange={setCenterFontSizeMm}
                  min={3}
                  max={40}
                  step={0.5}
                />

                <label className="grid gap-1">
                  <div className="text-[11px] text-slate-400">Top text</div>
                  <input
                    type="text"
                    value={topText}
                    onChange={(e) => setTopText(e.target.value)}
                    placeholder="Top text"
                    className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs"
                  />
                </label>

                <NumberInput
                  label="Top size"
                  value={topFontSizeMm}
                  onChange={setTopFontSizeMm}
                  min={3}
                  max={30}
                  step={0.5}
                />

                <label className="grid gap-1">
                  <div className="text-[11px] text-slate-400">Bottom text</div>
                  <input
                    type="text"
                    value={bottomText}
                    onChange={(e) => setBottomText(e.target.value)}
                    placeholder="Bottom text"
                    className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs"
                  />
                </label>

                <NumberInput
                  label="Bottom size"
                  value={bottomFontSizeMm}
                  onChange={setBottomFontSizeMm}
                  min={3}
                  max={30}
                  step={0.5}
                />

                <Checkbox
                  label="UPPERCASE"
                  checked={uppercase}
                  onChange={setUppercase}
                />
              </div>
            </Section>

            {/* Curved Text */}
            <Section title="Curved Text" defaultOpen={false}>
              <div className="space-y-4">
                <CurvedTextControls
                  position="top"
                  config={topCurvedText}
                  onChange={setTopCurvedText}
                  maxRadius={diameter / 2}
                  hideTextInput
                />
                <div className="border-t border-slate-800" />
                <CurvedTextControls
                  position="center"
                  config={centerCurvedText}
                  onChange={setCenterCurvedText}
                  maxRadius={diameter / 2}
                  hideTextInput
                />
                <div className="border-t border-slate-800" />
                <CurvedTextControls
                  position="bottom"
                  config={bottomCurvedText}
                  onChange={setBottomCurvedText}
                  maxRadius={diameter / 2}
                  hideTextInput
                />
              </div>
            </Section>

            {/* Selection */}
            <Section title="Selection" defaultOpen={false}>
              {selectedElement ? (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400">
                    {selectedElement.name || selectedElement.kind}
                  </div>

                  <NumberInput
                    label="Scale X"
                    value={selectedElement.transform.scaleX ?? 1}
                    onChange={(v) =>
                      dispatch({
                        type: 'UPDATE_TRANSFORM',
                        id: selectedElement.id,
                        transform: { scaleX: v },
                      })
                    }
                    min={0.1}
                    max={10}
                    step={0.1}
                    unit="×"
                  />

                  <NumberInput
                    label="Scale Y"
                    value={selectedElement.transform.scaleY ?? 1}
                    onChange={(v) =>
                      dispatch({
                        type: 'UPDATE_TRANSFORM',
                        id: selectedElement.id,
                        transform: { scaleY: v },
                      })
                    }
                    min={0.1}
                    max={10}
                    step={0.1}
                    unit="×"
                  />

                  {selectedElement.kind === 'text' && (
                    <NumberInput
                      label="Font size"
                      value={(selectedElement as any).fontSizeMm ?? 10}
                      onChange={(v) =>
                        dispatch({
                          type: 'UPDATE_ELEMENT',
                          id: selectedElement.id,
                          updates: { fontSizeMm: v },
                        })
                      }
                      min={3}
                      max={60}
                      step={0.5}
                    />
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500">Select an element to edit size.</div>
              )}
            </Section>

            {/* Alignment & Pathfinder */}
            <Section title="Transform" defaultOpen={false}>
              <div className="space-y-4">
                <AlignmentControls
                  onAlign={handleAlignment}
                  selectionCount={selectionCount}
                />
                <div className="border-t border-slate-800" />
                <PathfinderPanel
                  onOperation={handlePathfinder}
                  selectionCount={selectionCount}
                />
              </div>
            </Section>

            {/* Insert - No Dropdown */}
            <Section title="Insert">
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={trace.openTrace}
                  data-tour="trace-add-logo"
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-md"
                >
                  Add Logo/Icon (Trace)
                </button>

                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <div className="text-[10px] font-medium text-purple-400 mb-2">AI Generate</div>
                  <AIGeneratePanel
                    onGenerate={handleAIGenerate}
                    onInsert={handleAIInsert}
                  />
                </div>

                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <div className="text-[10px] font-medium text-orange-400 mb-2">Image Trace</div>
                  <ImageTracePanel
                    onTrace={handleImageTrace}
                    onInsert={handleTracedInsert}
                  />
                </div>

                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <div className="text-[10px] font-medium text-pink-400 mb-2">Ornaments</div>
                  <OrnamentLibrary
                    onInsert={handleOrnamentInsert}
                  />
                </div>
              </div>
            </Section>

          </aside>

        {/* Center Panel: Canvas */}
        <section className="min-h-[560px] sticky top-4">
          <div className="flex h-[calc(100vh-160px)] flex-col rounded-lg border border-slate-800 bg-slate-900/40">
            {/* Canvas toolbar */}
            <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
              <div className="text-sm font-medium text-slate-100">Canvas</div>

              <div className="flex items-center gap-2">
                {/* Layer colors toggle */}
                <button
                  type="button"
                  onClick={() => setShowLayerColors(!showLayerColors)}
                  className={`p-1.5 rounded ${showLayerColors ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  title="Toggle layer colors"
                >
                  <Layers className="w-4 h-4" />
                </button>

                {/* Guide toggle */}
                <button
                  type="button"
                  onClick={() => setShowGuide(!showGuide)}
                  className={`p-1.5 rounded ${showGuide ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  title="Toggle guide layer"
                >
                  {showGuide ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>

                <div className="h-4 w-px bg-slate-700" />

                {/* Zoom controls */}
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 bg-slate-800 rounded hover:bg-slate-700"
                  title="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <span className="text-xs text-slate-400 w-12 text-center">
                  {Math.round(view.zoom * 100)}%
                </span>

                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1.5 bg-slate-800 rounded hover:bg-slate-700"
                  title="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleZoomFit}
                  className="p-1.5 bg-slate-800 rounded hover:bg-slate-700"
                  title="Fit to view"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 min-h-[400px]">
              <CanvasStage
                doc={doc}
                selection={selection}
                view={view}
                onViewChange={setView}
                onSelect={handleSelect}
                onClearSelection={handleClearSelection}
                onUpdateTransform={handleUpdateTransform}
                onUpdateTransforms={handleUpdateTransforms}
                onCommit={handleCommit}
                showLayerColors={showLayerColors}
                showGuide={showGuide}
              />
            </div>

            {/* Info bar */}
            <div className="border-t border-slate-800 px-3 py-2 flex items-center justify-between text-[11px] text-slate-500">
              <span>
                {shape} • {doc.artboard.widthMm}×{doc.artboard.heightMm}mm
              </span>
              <span>
                {selection.selectedIds.length > 0
                  ? `${selection.selectedIds.length} selected`
                  : `${doc.elements.length} elements`
                }
              </span>
            </div>

            {/* Download SVG Button */}
            <div className="border-t border-slate-800 px-3 py-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const svgString = await buildExportSvgAsync(doc, false);
                    
                    // Aggressive sanitization for LightBurn - keep only safe ASCII
                    const cleanSvg = svgString
                      .split('')
                      .map(char => {
                        const code = char.charCodeAt(0);
                        // Keep only: space (32), printable ASCII (33-126), newline (10)
                        if (code === 10 || code === 32 || (code >= 33 && code <= 126)) {
                          return char;
                        }
                        return '';
                      })
                      .join('')
                      .replace(/\n+/g, '\n') // Normalize newlines
                      .trim();
                    
                    const blob = new Blob([cleanSvg], { type: 'image/svg+xml;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `coaster-${Date.now()}.svg`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch (e) {
                    console.error('Export failed:', e);
                    alert('Export failed: ' + (e as Error).message);
                  }
                }}
                className="w-full px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-md"
              >
                Download SVG
              </button>

              <ExportMiniDisclaimer className="mt-2" />
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
