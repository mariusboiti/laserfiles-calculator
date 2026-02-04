'use client';

import React, { useReducer, useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  RotateCcw, ZoomIn, ZoomOut, Maximize2,
  Undo2, Redo2, Layers, Eye, EyeOff, ChevronDown, ChevronUp,
  Type, Circle, Hexagon, Octagon, Sparkles,
  Wand2, Image, Flower2, AlignCenter
} from 'lucide-react';

import { jobManager } from '../../../jobs/jobManager';

import type { CanvasDocument, ViewTransform, HistoryState } from '../types/canvas';
import { DEFAULT_VIEW, DEFAULT_SELECTION, LAYER_COLORS } from '../types/canvas';
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
import { useLanguage } from '@/lib/i18n/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';
import { refreshEntitlements } from '@/lib/entitlements/client';

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
  textKey: string;
}

const QUICK_PRESETS: QuickPreset[] = [
  { id: 'coaster-90', name: 'round_coaster.presets.coaster_90', shape: 'circle', diameter: 90, textKey: 'round_coaster.presets.text_coaster' },
  { id: 'coaster-100', name: 'round_coaster.presets.coaster_100', shape: 'circle', diameter: 100, textKey: 'round_coaster.presets.text_coaster' },
  { id: 'badge-60', name: 'round_coaster.presets.badge_60', shape: 'circle', diameter: 60, textKey: 'round_coaster.presets.text_badge' },
  { id: 'badge-70', name: 'round_coaster.presets.badge_70', shape: 'circle', diameter: 70, textKey: 'round_coaster.presets.text_badge' },
  { id: 'hex-90', name: 'round_coaster.presets.hex_90', shape: 'hex', diameter: 90, textKey: 'round_coaster.presets.text_hex' },
];

// ============ Main Component ============

interface RoundCoasterToolProProps {
  onResetCallback?: (callback: () => void) => void;
  onGetExportPayload?: (
    getExportPayload: () => Promise<{ svg: string; name?: string; meta?: any }> | { svg: string; name?: string; meta?: any }
  ) => void;
}

export function RoundCoasterToolPro({ onResetCallback, onGetExportPayload }: RoundCoasterToolProProps) {
  // i18n
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);
  const defaultCenterText = t('round_coaster.defaults.center_text');
  const prevDefaultCenterText = useRef<string | null>(null);

  // Canvas state with history
  const [history, dispatch] = useReducer(
    canvasReducer,
    createCoasterDocument('circle', 90, undefined, undefined, defaultCenterText),
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

  // Text state
  const [centerText, setCenterText] = useState(() => defaultCenterText);
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
    const prevDefault = prevDefaultCenterText.current;
    if (prevDefault && centerText === prevDefault) {
      setCenterText(defaultCenterText);
    }
    prevDefaultCenterText.current = defaultCenterText;
  }, [defaultCenterText, centerText]);

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
    const newDoc = createCoasterDocument('circle', 90, undefined, undefined, defaultCenterText);
    dispatch({ type: 'RESET', doc: newDoc });
    setShape('circle');
    setDiameter(90);
    setCenterText(defaultCenterText);
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
  }, [defaultCenterText]);

  // Register reset callback
  useEffect(() => {
    if (onResetCallback) {
      onResetCallback(resetToDefaults);
    }
  }, [onResetCallback, resetToDefaults]);

  // Rebuild document when shape/dimensions/border/text change
  const rebuildDocument = useCallback(async () => {
    const preserved = preservedElementsRef.current;
    const size = diameter;
    const text = uppercase ? centerText.toUpperCase() : centerText;
    const top = uppercase ? topText.toUpperCase() : topText;
    const bottom = uppercase ? bottomText.toUpperCase() : bottomText;

    const newDoc = createCoasterDocument(shape, size, undefined, undefined, text, {
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
        el.name = position === 'top'
          ? t('round_coaster.curved.top_arc')
          : position === 'bottom'
            ? t('round_coaster.curved.bottom_arc')
            : t('round_coaster.curved.center_arc');
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
  }, [bottomCurvedText, borderEnabled, borderInset, borderThickness, centerCurvedText, centerFontSizeMm, centerText, diameter, doubleBorder, doubleBorderGap, fontId, shape, topCurvedText, topFontSizeMm, topText, bottomFontSizeMm, bottomText, uppercase, t]);

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

  const getElementDisplayName = useCallback((element: any) => {
    if (!element) return '';
    if (element.name) {
      switch (element.name) {
        case 'Base Shape':
          return t('round_coaster.elements.base_shape');
        case 'Border':
          return t('round_coaster.elements.border');
        case 'Border (Double)':
          return t('round_coaster.elements.border_double');
        case 'Text':
          return t('round_coaster.elements.text');
        case 'Top Text':
          return t('round_coaster.elements.top_text');
        case 'Center Text':
          return t('round_coaster.elements.center_text');
        case 'Bottom Text':
          return t('round_coaster.elements.bottom_text');
        default:
          return element.name;
      }
    }
    switch (element.kind) {
      case 'shape':
        return t('round_coaster.elements.base_shape');
      case 'border':
        return element.isDoubleBorder
          ? t('round_coaster.elements.border_double')
          : t('round_coaster.elements.border');
      case 'text':
        return t('round_coaster.elements.text');
      case 'ornament':
        return t('round_coaster.elements.ornament');
      case 'logo':
        return t('round_coaster.elements.logo');
      case 'traced':
        return t('round_coaster.elements.traced');
      case 'icon':
        return t('round_coaster.elements.icon');
      case 'basicShape':
        return t('round_coaster.elements.basic_shape');
      default:
        return element.kind;
    }
  }, [t]);

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
  }, []);

  const handleDiameterPreset = useCallback((d: number) => {
    setDiameter(d);
  }, []);

  const handleQuickPreset = useCallback((preset: QuickPreset) => {
    setShape(preset.shape);
    setDiameter(preset.diameter);
    setCenterText(t(preset.textKey));
  }, [t]);

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

  const handleDeleteSelection = useCallback(() => {
    if (selection.selectedIds.length === 0) return;
    const deletable = selection.selectedIds.filter((id) => {
      const el = doc.elements.find((e) => e.id === id);
      return el && el.system !== true;
    });
    if (deletable.length === 0) return;
    dispatch({ type: 'REMOVE_ELEMENTS', ids: deletable });
    dispatch({ type: 'COMMIT' });
  }, [doc.elements, selection.selectedIds]);

  useEffect(() => {
    const isEditableTarget = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      if (el.isContentEditable) return true;
      const tag = el.tagName?.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select';
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      const isMac = navigator.platform.toLowerCase().includes('mac');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelection();
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleDeleteSelection, handleRedo, handleUndo]);

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
          newX = cx;
          newY = cy;
          break;
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
    const cleanPrompt = (prompt || '').trim();
    if (!cleanPrompt) return null;

    const res = await jobManager.runJob({
      id: 'round-coaster-ai-generate',
      label: t('round_coaster.ai.job_generating'),
      fn: async (signal) => {
        const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        const accessToken = typeof window !== 'undefined' ? window.localStorage.getItem('accessToken') : null;
        if (accessToken) {
          authHeaders['Authorization'] = `Bearer ${accessToken}`;
        }
        const imageRes = await fetch('/api/ai/silhouette', {
          method: 'POST',
          headers: authHeaders,
          credentials: 'include',
          body: JSON.stringify({ prompt: cleanPrompt }),
          signal,
        });
        const imageJson = await imageRes.json().catch(() => null);
        if (!imageRes.ok) {
          throw new Error(imageJson?.error || t('round_coaster.ai.error_generation_failed'));
        }
        const dataUrl = String(imageJson?.dataUrl || '');
        if (!dataUrl) {
          throw new Error(t('round_coaster.ai.error_no_image'));
        }

        const traceRes = await fetch('/api/trace/potrace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataUrl,
            mode: 'CUT_SILHOUETTE',
            targetWidthMm: doc.artboard.widthMm,
            targetHeightMm: doc.artboard.heightMm,
            threshold: 180,
            invert: false,
            optTolerance: 0.2,
            autoInvert: false,
          }),
          signal,
        });
        const traceJson = await traceRes.json().catch(() => null);
        if (!traceRes.ok || !traceJson?.ok) {
          throw new Error(traceJson?.error || t('round_coaster.trace.error_failed'));
        }
        const combinedPath = String(traceJson?.combinedPath || '');
        if (!combinedPath) {
          throw new Error(t('round_coaster.trace.error_no_vector'));
        }

        return { dataUrl, combinedPath };
      },
      timeoutMs: 90000,
    });

    if (!res.ok || !res.data) {
      showToast(t('round_coaster.ai.toast_failed'), 'error');
      return null;
    }

    // Refresh credits in UI
    refreshEntitlements();

    return { imageUrl: String(res.data.dataUrl), pathD: String(res.data.combinedPath) };
  }, [doc.artboard.heightMm, doc.artboard.widthMm, t]);

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
      label: t('round_coaster.trace.job_tracing'),
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
  }, [doc.artboard.widthMm, doc.artboard.heightMm, t]);

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

  const selectionCount = selection.selectedIds.length;

  const [lockScale, setLockScale] = useState(false);
  const scaleRatioRef = useRef(1);

  useEffect(() => {
    if (!lockScale) return;
    if (!selectedElement) return;
    const sx = selectedElement.transform.scaleX ?? 1;
    const sy = selectedElement.transform.scaleY ?? 1;
    const safeSx = Math.abs(sx) < 0.000001 ? 1 : sx;
    scaleRatioRef.current = sy / safeSx;
  }, [lockScale, selectedElement?.id]);

  const elementsByLayer = useMemo(() => {
    const cut: typeof doc.elements = [];
    const engrave: typeof doc.elements = [];
    const guide: typeof doc.elements = [];

    for (const el of doc.elements) {
      if (el.layer === 'CUT') cut.push(el);
      else if (el.layer === 'ENGRAVE') engrave.push(el);
      else guide.push(el);
    }

    return { cut, engrave, guide };
  }, [doc.elements]);

  return (
    <div className="lfs-tool bg-slate-950 text-slate-100">
      {trace.TraceModal}

      <div className="grid w-full grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[360px_1fr]">
        {/* Left Panel: Insert + Settings */}
        <aside className="max-h-[calc(100vh-160px)] overflow-y-auto space-y-3 pr-1">

            {/* Quick Presets */}
            <Section title={t('round_coaster.sections.quick_presets')}>
              <div className="flex flex-wrap gap-2">
                {QUICK_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleQuickPreset(preset)}
                    className="px-2.5 py-1.5 text-[11px] border border-slate-700 bg-slate-900 rounded hover:bg-slate-800 hover:border-slate-600"
                  >
                    {t(preset.name)}
                  </button>
                ))}
              </div>
            </Section>

            {/* Layers */}
            <Section title={t('round_coaster.sections.layers')} defaultOpen={false}>
              <div className="space-y-3">
                {(
                  [
                    { id: 'CUT' as const, label: t('round_coaster.layers.cut'), elements: elementsByLayer.cut },
                    { id: 'ENGRAVE' as const, label: t('round_coaster.layers.engrave'), elements: elementsByLayer.engrave },
                    { id: 'GUIDE' as const, label: t('round_coaster.layers.guide'), elements: elementsByLayer.guide },
                  ] as const
                ).map((group) => (
                  <div key={group.id} className="space-y-1">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: LAYER_COLORS[group.id] }}
                      />
                      <span>{group.label}</span>
                      <span className="text-slate-600">({group.elements.length})</span>
                    </div>
                    {group.elements.length > 0 ? (
                      <div className="space-y-1">
                        {group.elements
                          .slice()
                          .reverse()
                          .map((el) => {
                            const isActive = selection.activeId === el.id;
                            const isSelected = selection.selectedIds.includes(el.id);
                            const isDisabled = el.visible === false;
                            return (
                              <button
                                key={el.id}
                                type="button"
                                onClick={() => dispatch({ type: 'SELECT', ids: [el.id] })}
                                className={`w-full text-left px-2 py-1 rounded border text-[11px] ${
                                  isActive
                                    ? 'bg-sky-600 border-sky-500 text-white'
                                    : isSelected
                                      ? 'bg-slate-800 border-slate-600 text-slate-100'
                                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                                } ${isDisabled ? 'opacity-50' : ''}`}
                              >
                                {getElementDisplayName(el)}
                              </button>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-600">{t('round_coaster.layers.empty')}</div>
                    )}
                  </div>
                ))}
              </div>
            </Section>

            {/* Selection */}
            <Section title={t('round_coaster.sections.selection')} defaultOpen={false}>
              {selectedElement ? (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400">{getElementDisplayName(selectedElement)}</div>

                  <Checkbox
                    label={t('round_coaster.checkboxes.lock_aspect')}
                    checked={lockScale}
                    onChange={setLockScale}
                  />

                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('round_coaster.labels.scale_x')}</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0.1}
                        max={10}
                        step={0.1}
                        value={selectedElement.transform.scaleX ?? 1}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          const ratio = scaleRatioRef.current || 1;
                          dispatch({
                            type: 'UPDATE_TRANSFORM',
                            id: selectedElement.id,
                            transform: lockScale ? { scaleX: v, scaleY: v * ratio } : { scaleX: v },
                          });
                        }}
                        className="w-full"
                      />
                      <span className="text-[10px] text-slate-500 w-10 text-right">{(selectedElement.transform.scaleX ?? 1).toFixed(1)}×</span>
                    </div>
                  </label>

                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('round_coaster.labels.scale_y')}</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0.1}
                        max={10}
                        step={0.1}
                        value={selectedElement.transform.scaleY ?? 1}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          const ratio = scaleRatioRef.current || 1;
                          const safeRatio = Math.abs(ratio) < 0.000001 ? 1 : ratio;
                          dispatch({
                            type: 'UPDATE_TRANSFORM',
                            id: selectedElement.id,
                            transform: lockScale ? { scaleY: v, scaleX: v / safeRatio } : { scaleY: v },
                          });
                        }}
                        className="w-full"
                      />
                      <span className="text-[10px] text-slate-500 w-10 text-right">{(selectedElement.transform.scaleY ?? 1).toFixed(1)}×</span>
                    </div>
                  </label>
                  {selectedElement.kind === 'text' && (
                    <NumberInput
                      label={t('round_coaster.labels.font_size')}
                      value={(selectedElement as any).fontSizeMm}
                      onChange={(v) => dispatch({ type: 'UPDATE_ELEMENT', id: selectedElement.id, updates: { fontSizeMm: v } })}
                      min={3}
                      max={60}
                      step={0.5}
                    />
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500">{t('round_coaster.selection.select_element')}</div>
              )}
            </Section>

            {activeLogo && (
              <Section title={t('round_coaster.sections.logo')} defaultOpen={false}>
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-400">{t('round_coaster.logo.operation')}</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSetLogoOp('ENGRAVE')}
                      className={`flex-1 px-2 py-1.5 rounded text-xs border ${activeLogo.op === 'ENGRAVE' ? 'bg-sky-600 border-sky-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'}`}
                    >
                      {t('round_coaster.logo.engrave')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetLogoOp('CUT_OUT')}
                      className={`flex-1 px-2 py-1.5 rounded text-xs border ${activeLogo.op === 'CUT_OUT' ? 'bg-sky-600 border-sky-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'}`}
                    >
                      {t('round_coaster.logo.cut_out')}
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {t('round_coaster.logo.cut_out_hint')}
                  </div>
                </div>
              </Section>
            )}

            {/* Shape */}
            <Section title={t('round_coaster.sections.shape')}>
              <div className="flex flex-wrap gap-2">
                {(['circle', 'hex', 'octagon', 'scalloped'] as ShapeType[]).map((s) => {
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
                      title={t(`round_coaster.shapes.${s}`)}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Dimensions */}
            <Section title={t('round_coaster.sections.dimensions')}>
              {/* Step size selector */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] text-slate-500">{t('round_coaster.labels.step')}</span>
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
                label={t('round_coaster.labels.diameter')}
                value={diameter}
                onChange={setDiameter}
                min={30}
                max={300}
                step={stepSize}
              />
            </Section>

            {/* Border */}
            <Section title={t('round_coaster.sections.border')}>
              <Checkbox
                label={t('round_coaster.checkboxes.enable_border')}
                checked={borderEnabled}
                onChange={setBorderEnabled}
              />

              {borderEnabled && (
                <div className="space-y-3 mt-2">
                  <NumberInput
                    label={t('round_coaster.labels.border_inset')}
                    value={borderInset}
                    onChange={setBorderInset}
                    min={1}
                    max={20}
                    step={0.5}
                  />

                  <NumberInput
                    label={t('round_coaster.labels.stroke_thickness')}
                    value={borderThickness}
                    onChange={setBorderThickness}
                    min={0.2}
                    max={1.2}
                    step={0.1}
                  />

                  <Checkbox
                    label={t('round_coaster.checkboxes.double_border')}
                    checked={doubleBorder}
                    onChange={setDoubleBorder}
                  />

                  {doubleBorder && (
                    <NumberInput
                      label={t('round_coaster.labels.double_border_gap')}
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
            <Section title={t('round_coaster.sections.text')}>
              <div className="space-y-3">
                <FontPicker
                  value={fontId}
                  onChange={setFontId}
                  label={t('round_coaster.labels.font')}
                />

                <label className="grid gap-1">
                  <div className="text-[11px] text-slate-400">{t('round_coaster.labels.center_text')}</div>
                  <input
                    type="text"
                    value={centerText}
                    onChange={(e) => setCenterText(e.target.value)}
                    placeholder={t('round_coaster.placeholders.main_text')}
                    className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs"
                  />
                </label>

                <NumberInput
                  label={t('round_coaster.labels.center_size')}
                  value={centerFontSizeMm}
                  onChange={setCenterFontSizeMm}
                  min={3}
                  max={40}
                  step={0.5}
                />

                <label className="grid gap-1">
                  <div className="text-[11px] text-slate-400">{t('round_coaster.labels.top_text')}</div>
                  <input
                    type="text"
                    value={topText}
                    onChange={(e) => setTopText(e.target.value)}
                    placeholder={t('round_coaster.placeholders.top_text')}
                    className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs"
                  />
                </label>

                <NumberInput
                  label={t('round_coaster.labels.top_size')}
                  value={topFontSizeMm}
                  onChange={setTopFontSizeMm}
                  min={3}
                  max={30}
                  step={0.5}
                />

                <label className="grid gap-1">
                  <div className="text-[11px] text-slate-400">{t('round_coaster.labels.bottom_text')}</div>
                  <input
                    type="text"
                    value={bottomText}
                    onChange={(e) => setBottomText(e.target.value)}
                    placeholder={t('round_coaster.placeholders.bottom_text')}
                    className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs"
                  />
                </label>

                <NumberInput
                  label={t('round_coaster.labels.bottom_size')}
                  value={bottomFontSizeMm}
                  onChange={setBottomFontSizeMm}
                  min={3}
                  max={30}
                  step={0.5}
                />

                <Checkbox
                  label={t('round_coaster.checkboxes.uppercase')}
                  checked={uppercase}
                  onChange={setUppercase}
                />
              </div>
            </Section>

            {/* Curved Text */}
            <Section title={t('round_coaster.sections.curved_text')} defaultOpen={false}>
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
            <Section title={t('round_coaster.sections.selection')} defaultOpen={false}>
              {selectedElement ? (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400">
                    {getElementDisplayName(selectedElement)}
                  </div>

                  <Checkbox
                    label={t('round_coaster.checkboxes.lock_aspect')}
                    checked={lockScale}
                    onChange={setLockScale}
                  />

                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('round_coaster.labels.scale_x')}</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0.1}
                        max={10}
                        step={0.1}
                        value={selectedElement.transform.scaleX ?? 1}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          const ratio = scaleRatioRef.current || 1;
                          dispatch({
                            type: 'UPDATE_TRANSFORM',
                            id: selectedElement.id,
                            transform: lockScale ? { scaleX: v, scaleY: v * ratio } : { scaleX: v },
                          });
                        }}
                        className="w-full"
                      />
                      <span className="text-[10px] text-slate-500 w-10 text-right">{(selectedElement.transform.scaleX ?? 1).toFixed(1)}×</span>
                    </div>
                  </label>

                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('round_coaster.labels.scale_y')}</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0.1}
                        max={10}
                        step={0.1}
                        value={selectedElement.transform.scaleY ?? 1}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          const ratio = scaleRatioRef.current || 1;
                          const safeRatio = Math.abs(ratio) < 0.000001 ? 1 : ratio;
                          dispatch({
                            type: 'UPDATE_TRANSFORM',
                            id: selectedElement.id,
                            transform: lockScale ? { scaleY: v, scaleX: v / safeRatio } : { scaleY: v },
                          });
                        }}
                        className="w-full"
                      />
                      <span className="text-[10px] text-slate-500 w-10 text-right">{(selectedElement.transform.scaleY ?? 1).toFixed(1)}×</span>
                    </div>
                  </label>

                  {selectedElement.kind === 'text' && (
                    <NumberInput
                      label={t('round_coaster.labels.font_size')}
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
                <div className="text-xs text-slate-500">{t('round_coaster.selection.select_element')}</div>
              )}
            </Section>

            {/* Alignment & Pathfinder */}
            <Section title={t('round_coaster.sections.transform')} defaultOpen={false}>
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
            <Section title={t('round_coaster.sections.insert')}>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={trace.openTrace}
                  data-tour="trace-add-logo"
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-md"
                >
                  {t('round_coaster.buttons.add_logo_trace')}
                </button>

                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <div className="text-[10px] font-medium text-purple-400 mb-2">{t('round_coaster.ai.title')}</div>
                  <AIGeneratePanel
                    onGenerate={handleAIGenerate}
                    onInsert={handleAIInsert}
                  />
                </div>

                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <div className="text-[10px] font-medium text-orange-400 mb-2">{t('round_coaster.trace.title')}</div>
                  <ImageTracePanel
                    onTrace={handleImageTrace}
                    onInsert={handleTracedInsert}
                  />
                </div>

                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <div className="text-[10px] font-medium text-pink-400 mb-2">{t('round_coaster.ornaments.title')}</div>
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
              <div className="text-sm font-medium text-slate-100">{t('round_coaster.sections.canvas')}</div>

              <div className="flex items-center gap-2">
                {/* Layer colors toggle */}
                <button
                  type="button"
                  onClick={() => setShowLayerColors(!showLayerColors)}
                  className={`p-1.5 rounded ${showLayerColors ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  title={t('round_coaster.tooltips.toggle_layer_colors')}
                >
                  <Layers className="w-4 h-4" />
                </button>

                {/* Guide toggle */}
                <button
                  type="button"
                  onClick={() => setShowGuide(!showGuide)}
                  className={`p-1.5 rounded ${showGuide ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  title={t('round_coaster.tooltips.toggle_guide')}
                >
                  {showGuide ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>

                <div className="h-4 w-px bg-slate-700" />

                {/* Zoom controls */}
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 bg-slate-800 rounded hover:bg-slate-700"
                  title={t('round_coaster.tooltips.zoom_out')}
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
                  title={t('round_coaster.tooltips.zoom_in')}
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleZoomFit}
                  className="p-1.5 bg-slate-800 rounded hover:bg-slate-700"
                  title={t('round_coaster.tooltips.fit_to_view')}
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
                {t(`round_coaster.shapes.${shape}`)} • {doc.artboard.widthMm}×{doc.artboard.heightMm}mm
              </span>
              <span>
                {selection.selectedIds.length > 0
                  ? t('round_coaster.selection.n_selected').replace('{n}', String(selection.selectedIds.length))
                  : t('round_coaster.selection.n_elements').replace('{n}', String(doc.elements.length))
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
                    alert(t('round_coaster.errors.export_failed') + ' ' + (e as Error).message);
                  }
                }}
                className="w-full px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-md"
              >
                {t('round_coaster.buttons.download_svg')}
              </button>

              <ExportMiniDisclaimer className="mt-2" />
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
