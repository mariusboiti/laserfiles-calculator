'use client';

import React, { useReducer, useCallback, useMemo, useState, useEffect } from 'react';
import {
  RotateCcw, Download, ZoomIn, ZoomOut, Maximize2,
  Undo2, Redo2, Layers, Eye, EyeOff, ChevronDown, ChevronUp,
  Type, Circle, Hexagon, Shield, Octagon, Sparkles
} from 'lucide-react';

import type { CanvasDocument, ViewTransform, HistoryState } from '../types/canvas';
import { DEFAULT_VIEW, DEFAULT_SELECTION } from '../types/canvas';
import {
  canvasReducer,
  createInitialHistory,
  canUndo,
  canRedo,
} from '../core/canvas/canvasReducer';
import { createCoasterDocument, createTextElement } from '../core/canvas/elements';
import { fitToContainer } from '../core/canvas/coords';
import type { ShapeType } from '../core/canvas/shapes';
import { CanvasStage } from './components/CanvasStage';
import { buildExportSvg } from '../core/exportSvg';

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

// ============ Main Component ============

interface RoundCoasterToolProProps {
  onResetCallback?: (callback: () => void) => void;
}

export function RoundCoasterToolPro({ onResetCallback }: RoundCoasterToolProProps) {
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

  // Border state
  const [borderEnabled, setBorderEnabled] = useState(true);
  const [borderInset, setBorderInset] = useState(3);
  const [borderThickness, setBorderThickness] = useState(0.4);
  const [doubleBorder, setDoubleBorder] = useState(false);
  const [doubleBorderGap, setDoubleBorderGap] = useState(1.2);

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
  }, []);

  // Register reset callback
  useEffect(() => {
    if (onResetCallback) {
      onResetCallback(resetToDefaults);
    }
  }, [onResetCallback, resetToDefaults]);

  // Rebuild document when shape/dimensions/border/text change
  const rebuildDocument = useCallback(() => {
    const size = shape === 'shield' ? Math.max(width, height) : diameter;
    const w = shape === 'shield' ? width : undefined;
    const h = shape === 'shield' ? height : undefined;
    const text = uppercase ? centerText.toUpperCase() : centerText;
    const top = uppercase ? topText.toUpperCase() : topText;
    const bottom = uppercase ? bottomText.toUpperCase() : bottomText;

    const newDoc = createCoasterDocument(shape, size, w, h, text, {
      topText: top,
      bottomText: bottom,
      border: {
        enabled: borderEnabled,
        inset: borderInset,
        thickness: borderThickness,
        doubleBorder,
        doubleBorderGap,
      },
    });
    dispatch({ type: 'RESET', doc: newDoc });
  }, [shape, diameter, width, height, centerText, topText, bottomText, uppercase, borderEnabled, borderInset, borderThickness, doubleBorder, doubleBorderGap]);

  // Debounced rebuild
  useEffect(() => {
    const timer = setTimeout(rebuildDocument, 150);
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

  // Export
  const handleExport = useCallback(() => {
    const svg = buildExportSvg(doc, showLayerColors);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coaster-${shape}-${diameter}mm.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [doc, showLayerColors, shape, diameter]);

  const isShield = shape === 'shield';

  return (
    <div className="lfs-tool flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80">
        <div className="mx-auto flex w-full items-center justify-between gap-4 px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold text-slate-100 md:text-base">
              Round Coaster & Badge Generator
              <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-emerald-600 rounded">PRO</span>
            </h1>
            <p className="text-[11px] text-slate-400">Canvas editor with undo/redo, selection, layers</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo(history)}
              className="p-2 bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-50"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo(history)}
              className="p-2 bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-50"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <div className="h-6 w-px bg-slate-700" />
            <button
              type="button"
              onClick={resetToDefaults}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white border border-slate-700 rounded-md hover:bg-slate-800"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full flex-1 flex-col gap-4 px-4 py-4 md:flex-row">
        {/* Controls Panel */}
        <section className="w-full md:w-80 lg:w-96">
          <div className="max-h-[calc(100vh-96px)] overflow-y-auto space-y-3 pr-1">

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
                <label className="grid gap-1">
                  <div className="text-[11px] text-slate-400">Top text (optional)</div>
                  <input
                    type="text"
                    value={topText}
                    onChange={(e) => setTopText(e.target.value)}
                    placeholder="Top line"
                    className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs"
                  />
                </label>

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

                <label className="grid gap-1">
                  <div className="text-[11px] text-slate-400">Bottom text (optional)</div>
                  <input
                    type="text"
                    value={bottomText}
                    onChange={(e) => setBottomText(e.target.value)}
                    placeholder="Bottom line"
                    className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs"
                  />
                </label>

                <Checkbox
                  label="UPPERCASE"
                  checked={uppercase}
                  onChange={setUppercase}
                />
              </div>
            </Section>

            {/* Export */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleExport}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" /> Export SVG
              </button>
            </div>
          </div>
        </section>

        {/* Canvas Panel */}
        <section className="mt-2 flex flex-1 flex-col gap-3 md:mt-0">
          <div className="flex flex-1 flex-col rounded-lg border border-slate-800 bg-slate-900/40">
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
          </div>
        </section>
      </main>
    </div>
  );
}
