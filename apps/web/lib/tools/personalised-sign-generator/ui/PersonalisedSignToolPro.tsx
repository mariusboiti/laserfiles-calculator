
'use client';

/**
 * Personalised Sign Generator V3 PRO
 * Layer-based sign designer with interactive canvas, text-to-path, AI generation, and cut/engrave modes
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Download,
  RefreshCw,
  AlertTriangle,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Type,
  Circle,
  Settings2,
  Layers as LayersIcon,
  Plus,
  Trash2,
  Wand2,
  Combine,
  Image as ImageIcon,
  Package,
} from 'lucide-react';

import type {
  SignDocument,
  Layer,
  LayerType,
  TextElement,
  ShapeElement,
  EngraveSketchElement,
  AiGenerationMode,
  BaseShapeType,
} from '../types/signPro';

import {
  createDefaultDocument,
  updateArtboardSize,
  updateBaseShape,
  updateHoleConfig,
  updateHolePosition,
  addHole,
  deleteHole,
  updateLayer,
  reorderLayers,
  addLayer,
  deleteLayer,
  addElement,
  updateElement,
  deleteElement,
  setActiveLayer,
  findLayerByType,
  createTextElement,
  createShapeElement,
  createOrnamentElement,
  generateId,
} from '../core/layers/model';

import { renderPreviewSvgAsync, renderExportSvgAsync, generateProFilename } from '../core/renderProSvgAsync';
import { sanitizeSvg, extractSvgFromResponse } from '../core/ai/sanitizeSvg';
import { normalizeSvg, scaleSvgToFit, extractPaths } from '../core/ai/normalizeSvg';

import { LayerPanel } from './components/LayerPanel';
import { FontPicker } from './components/FontPicker';
import { AiGeneratePanel } from './components/AiGeneratePanel';
import { CanvasStage, type CanvasTool } from './components/CanvasStage';
import { CanvasToolbar } from './components/CanvasToolbar';
import { PathfinderPanel } from './components/PathfinderPanel';
import { ImageTracePanel } from './components/ImageTracePanel';
import { AlignPanel } from './components/AlignPanel';
import { OrnamentLibraryPanel } from './components/OrnamentLibraryPanel';
import { MountingHolesPanel } from './components/MountingHolesPanel';

import { ensureFontsLoaded } from '../../../fonts/fontLoader';
import { useHistoryReducer } from '../core/history/useHistoryReducer';
import { CanvasKeyboardShortcuts } from './components/CanvasKeyboardShortcuts';

import type { SelectionAction, SelectionState } from '../core/canvas/selectionReducer';
import {
  clearSelection,
  createSelectionState,
  selectSingle,
  selectionReducer,
} from '../core/canvas/selectionReducer';

import { SHAPE_OPTIONS, LIMITS } from '../config/defaultsV3';
import { ORNATE_LABELS } from '../core/shapes/ornateLabels';

import type { OrnamentId, OrnamentLayerType } from '../../../assets/ornaments';

interface Props {
  featureFlags?: { isProUser?: boolean };
}

export default function PersonalisedSignToolPro({ featureFlags }: Props) {
  const history = useHistoryReducer<{ doc: SignDocument; selection: SelectionState }>({
    doc: createDefaultDocument(),
    selection: createSelectionState(),
  });
  const editor = history.present;
  const doc = editor.doc;
  const selection = editor.selection;
  const selectedIds = selection.selectedIds;

  const editorRef = useRef(editor);
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const setEditor = useCallback(
    (next: { doc: SignDocument; selection: SelectionState }, commit: boolean = false) => {
      history.setPresent(next, commit);
    },
    [history]
  );
  const [activeTool, setActiveTool] = useState<CanvasTool>('select');
  const [showGrid, setShowGrid] = useState(false);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [showGuides, setShowGuides] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    shape: true,
    text: true,
    layers: true,
    mountingHoles: false,
    ai: false,
    pathfinder: false,
    imageTrace: false,
    ornaments: false,
    align: false,
    output: false,
  });
  
  const canvasRef = useRef<{ fitView: () => void; zoomIn: () => void; zoomOut: () => void } | null>(null);

  // Update document (committed by default; pass commit=false for live dragging)
  const updateDoc = useCallback(
    (updater: (doc: SignDocument) => SignDocument, commit: boolean = true) => {
      const cur = editorRef.current;
      const nextDoc = updater(cur.doc);
      setEditor({ ...cur, doc: nextDoc }, commit);
    },
    [setEditor]
  );

  const dispatchSelection = useCallback(
    (action: SelectionAction) => {
      const cur = editorRef.current;
      const nextSelection = selectionReducer(cur.selection, action);
      setEditor({ ...cur, selection: nextSelection }, false);
    },
    [setEditor]
  );

  // Toggle section
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  React.useEffect(() => {
    const fontIds: string[] = [];
    for (const layer of doc.layers) {
      for (const el of layer.elements) {
        if (el.kind === 'text' && el.fontId) {
          fontIds.push(el.fontId);
        }
      }
    }
    void ensureFontsLoaded(Array.from(new Set(fontIds)));
  }, [doc]);

  // Export handler
  const handleExport = useCallback(async () => {
    const exportResult = await renderExportSvgAsync(doc);
    const blob = new Blob([exportResult.svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generateProFilename(doc);
    a.click();
    URL.revokeObjectURL(url);
  }, [doc]);

  // Reset handler
  const handleReset = useCallback(() => {
    history.reset({ doc: createDefaultDocument(), selection: createSelectionState() });
  }, [history]);

  // AI generation handler
  const handleAiGenerated = useCallback((result: { mode: AiGenerationMode; svg?: string; pngDataUrl?: string }) => {
    const { svg, mode, pngDataUrl } = result;

    if (mode === 'engravingSketch') {
      if (!pngDataUrl) {
        console.warn('No PNG returned for sketch');
        return;
      }

      const targetLayer = findLayerByType(doc, 'ENGRAVE');
      if (!targetLayer) {
        console.warn('Target layer not found');
        return;
      }

      const element = {
        id: generateId(),
        kind: 'engraveImage' as const,
        pngDataUrl,
        widthMm: doc.artboard.wMm * 0.6,
        heightMm: doc.artboard.hMm * 0.6,
        transform: {
          xMm: doc.artboard.wMm / 2,
          yMm: doc.artboard.hMm / 2,
          rotateDeg: 0,
          scaleX: 1,
          scaleY: 1,
        },
      };

      const cur = editorRef.current;
      const nextDoc = addElement(cur.doc, targetLayer.id, element);
      const nextSelection = selectionReducer(cur.selection, selectSingle(element.id));
      setEditor({ doc: nextDoc, selection: nextSelection }, true);
      return;
    }

    if (!svg) {
      console.warn('No SVG returned');
      return;
    }

    // Sanitize and normalize
    const sanitized = sanitizeSvg(svg);
    if (!sanitized.svg) {
      console.warn('AI SVG sanitization failed');
      return;
    }

    const normalized = normalizeSvg(sanitized.svg);
    const scaled = scaleSvgToFit(
      normalized.svg,
      doc.artboard.wMm,
      doc.artboard.hMm,
      0.6
    );

    // Extract paths
    const paths = extractPaths(scaled.svg);
    if (paths.length === 0) {
      console.warn('No paths found in AI result');
      return;
    }

    // Find target layer (shapeSilhouette goes to CUT layer)
    const targetLayer = findLayerByType(doc, 'CUT');

    if (!targetLayer) {
      console.warn('Target layer not found');
      return;
    }

    // Create shape element for silhouette mode
    const element: ShapeElement = {
      id: generateId(),
      kind: 'shape',
      source: 'ai',
      svgPathD: paths.join(' '),
      style: 'CUT',
      transform: {
        xMm: doc.artboard.wMm / 2,
        yMm: doc.artboard.hMm / 2,
        rotateDeg: 0,
        scaleX: 1,
        scaleY: 1,
      },
    };

    const cur = editorRef.current;
    const nextDoc = addElement(cur.doc, targetLayer.id, element);
    const nextSelection = selectionReducer(cur.selection, selectSingle(element.id));
    setEditor({ doc: nextDoc, selection: nextSelection }, true);
  }, [doc, setEditor]);

  const handleInteractionBegin = useCallback(() => {
    history.beginInteraction();
  }, [history]);

  const handleInteractionEnd = useCallback(() => {
    history.endInteraction();
  }, [history]);

  const handleElementMove = useCallback((elementId: string, deltaXMm: number, deltaYMm: number) => {
    updateDoc((d) => {
      for (const layer of d.layers) {
        const el = layer.elements.find(e => e.id === elementId);
        if (el) {
          return updateElement(d, elementId, {
            transform: {
              ...el.transform,
              xMm: el.transform.xMm + deltaXMm,
              yMm: el.transform.yMm + deltaYMm,
            },
          });
        }
      }
      return d;
    }, false);
  }, [updateDoc]);

  const handleElementTransform = useCallback((
    elementId: string,
    transform: { scaleX?: number; scaleY?: number; rotateDeg?: number }
  ) => {
    updateDoc((d) => {
      for (const layer of d.layers) {
        const el = layer.elements.find(e => e.id === elementId);
        if (el) {
          return updateElement(d, elementId, {
            transform: {
              ...el.transform,
              ...(transform.scaleX !== undefined && { scaleX: transform.scaleX }),
              ...(transform.scaleY !== undefined && { scaleY: transform.scaleY }),
              ...(transform.rotateDeg !== undefined && { rotateDeg: transform.rotateDeg }),
            },
          });
        }
      }
      return d;
    }, false);
  }, [updateDoc]);

  const handleElementsMove = useCallback((deltas: Array<{ id: string; deltaXMm: number; deltaYMm: number }>) => {
    updateDoc((d) => {
      let result = d;
      for (const { id, deltaXMm, deltaYMm } of deltas) {
        for (const layer of result.layers) {
          const el = layer.elements.find(e => e.id === id);
          if (el) {
            result = updateElement(result, id, {
              transform: {
                ...el.transform,
                xMm: el.transform.xMm + deltaXMm,
                yMm: el.transform.yMm + deltaYMm,
              },
            });
            break;
          }
        }
      }
      return result;
    }, false);
  }, [updateDoc]);

  const handleAlignApply = useCallback((deltas: Array<{ id: string; deltaXMm: number; deltaYMm: number }>, skippedLocked: boolean) => {
    if (deltas.length > 0) {
      updateDoc((d) => {
        let result = d;
        for (const { id, deltaXMm, deltaYMm } of deltas) {
          for (const layer of result.layers) {
            const el = layer.elements.find(e => e.id === id);
            if (el) {
              result = updateElement(result, id, {
                transform: {
                  ...el.transform,
                  xMm: el.transform.xMm + deltaXMm,
                  yMm: el.transform.yMm + deltaYMm,
                },
              });
              break;
            }
          }
        }
        return result;
      }, true);
    }
    if (skippedLocked) {
      console.warn('Some items locked were skipped');
    }
  }, [updateDoc]);

  // Pathfinder result handler
  const handlePathfinderResult = useCallback((
    newElement: ShapeElement,
    targetLayerId: string,
    removeElementIds: string[]
  ) => {
    const cur = editorRef.current;
    let nextDoc = cur.doc;
    for (const id of removeElementIds) {
      nextDoc = deleteElement(nextDoc, id);
    }
    nextDoc = addElement(nextDoc, targetLayerId, newElement);
    const nextSelection = selectionReducer(cur.selection, selectSingle(newElement.id));
    setEditor({ doc: nextDoc, selection: nextSelection }, true);
  }, [setEditor]);

  // Image trace result handler
  const handleTraceResult = useCallback((
    element: ShapeElement | EngraveSketchElement,
    targetLayer: 'CUT' | 'ENGRAVE'
  ) => {
    const layer = findLayerByType(doc, targetLayer);
    if (!layer) return;

    const cur = editorRef.current;
    const nextDoc = addElement(cur.doc, layer.id, element);
    const nextSelection = selectionReducer(cur.selection, selectSingle(element.id));
    setEditor({ doc: nextDoc, selection: nextSelection }, true);
  }, [doc, setEditor]);

  const handleOrnamentInsert = useCallback((assetId: string, targetLayer: OrnamentLayerType, widthPct: number) => {
    const activeLayer = findLayerByType(doc, targetLayer);
    if (!activeLayer) return;

    const targetWidthMm = (doc.artboard.wMm * widthPct) / 100;
    const scale = targetWidthMm / 100;

    const newElement = createOrnamentElement(
      assetId as OrnamentId,
      targetLayer,
      doc.artboard.wMm / 2,
      doc.artboard.hMm / 2,
      scale
    );

    const cur = editorRef.current;
    const nextDoc = addElement(cur.doc, activeLayer.id, newElement);
    const nextSelection = selectionReducer(cur.selection, selectSingle(newElement.id));
    setEditor({ doc: nextDoc, selection: nextSelection }, true);
  },
  [doc, setEditor]
  );

  // Mounting holes handlers
  const handleUpdateHoleConfig = useCallback(
    (updates: Partial<SignDocument['holes']>) => {
      updateDoc(d => updateHoleConfig(d, updates));
    },
    [updateDoc]
  );

  const handleUpdateHolePosition = useCallback(
    (holeId: string, xMm: number, yMm: number, commit: boolean = true) => {
      updateDoc(d => updateHolePosition(d, holeId, xMm, yMm), commit);
    },
    [updateDoc]
  );

  const handleAddHole = useCallback(() => {
    updateDoc(d => addHole(d));
  }, [updateDoc]);

  const handleDeleteHole = useCallback(
    (holeId: string) => {
      updateDoc(d => deleteHole(d, holeId));
    },
    [updateDoc]
  );

  const handleDeleteSelection = useCallback(() => {
    if (selectedIds.length === 0) return;

    const cur = editorRef.current;
    let nextDoc = cur.doc;
    for (const id of selectedIds) {
      const found = nextDoc.layers.find(l => l.elements.some(e => e.id === id));
      const layer = found;
      if (layer?.locked) continue;
      nextDoc = deleteElement(nextDoc, id);
    }
    const nextSelection = selectionReducer(cur.selection, clearSelection());
    setEditor({ doc: nextDoc, selection: nextSelection }, true);
  }, [selectedIds, setEditor]);

  const handleEscape = useCallback(() => {
    dispatchSelection(clearSelection());
  }, [dispatchSelection]);

  // Get active layer's text elements
  const activeLayer = doc.layers.find(l => l.id === doc.activeLayerId);
  const textElements = activeLayer?.elements.filter(el => el.kind === 'text') as TextElement[] || [];

  return (
    <div className="h-full min-h-0 w-full flex flex-col lg:flex-row overflow-hidden">
      <CanvasKeyboardShortcuts
        enabled={true}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={history.undo}
        onRedo={history.redo}
        onDelete={handleDeleteSelection}
        onEscape={handleEscape}
      />
      {/* Controls Panel */}
      <div className="w-full lg:w-[400px] lg:min-w-[340px] lg:max-w-[480px] shrink-0 border-r border-slate-800 bg-slate-950/30">
        <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        
        {/* Shape Section */}
        <Section title="Shape & Size" icon={<Circle className="w-4 h-4" />} expanded={expandedSections.shape} onToggle={() => toggleSection('shape')}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Shape Type</label>
              <select
                value={doc.artboard.baseShape.shapeType}
                onChange={(e) => updateDoc(d => updateBaseShape(d, e.target.value as BaseShapeType))}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm"
              >
                <optgroup label="Basic Shapes">
                  {SHAPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Ornate Labels">
                  {ORNATE_LABELS.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <NumberInput
                label="Width (mm)"
                value={doc.artboard.wMm}
                onChange={(v) => updateDoc(d => updateArtboardSize(d, v, d.artboard.hMm))}
                min={LIMITS.width.min}
                max={LIMITS.width.max}
              />
              <NumberInput
                label="Height (mm)"
                value={doc.artboard.hMm}
                onChange={(v) => updateDoc(d => updateArtboardSize(d, d.artboard.wMm, v))}
                min={LIMITS.height.min}
                max={LIMITS.height.max}
              />
            </div>

            {['rounded-rect', 'rounded-arch', 'plaque'].includes(doc.artboard.baseShape.shapeType) && (
              <NumberInput
                label="Corner Radius"
                value={doc.artboard.baseShape.cornerRadius}
                onChange={(v) => updateDoc(d => updateBaseShape(d, d.artboard.baseShape.shapeType, v))}
                min={0}
                max={LIMITS.cornerRadius.max}
              />
            )}
          </div>
        </Section>

        {/* Text Section */}
        <Section title="Text Elements" icon={<Type className="w-4 h-4" />} expanded={expandedSections.text} onToggle={() => toggleSection('text')}>
          <div className="space-y-4">
            {textElements.map((element, index) => (
              <TextElementEditor
                key={element.id}
                element={element}
                label={`Line ${element.lineIndex}`}
                onUpdate={(updates) => updateDoc(d => updateElement(d, element.id, updates))}
                onDelete={() => updateDoc(d => deleteElement(d, element.id))}
              />
            ))}
            
            <button
              onClick={() => {
                if (!activeLayer) return;
                const newElement = createTextElement('custom', '', {
                  transform: {
                    xMm: doc.artboard.wMm / 2,
                    yMm: doc.artboard.hMm / 2,
                    rotateDeg: 0,
                    scaleX: 1,
                    scaleY: 1,
                  },
                });
                const cur = editorRef.current;
                const nextDoc = addElement(cur.doc, activeLayer.id, newElement);
                const nextSelection = selectionReducer(cur.selection, selectSingle(newElement.id));
                setEditor({ doc: nextDoc, selection: nextSelection }, true);
              }}
              className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Text Element
            </button>
          </div>
        </Section>

        {/* Layers Section */}
        <Section title="Layers" icon={<LayersIcon className="w-4 h-4" />} expanded={expandedSections.layers} onToggle={() => toggleSection('layers')}>
          <LayerPanel
            document={doc}
            onUpdateLayer={(layerId, updates) => updateDoc(d => updateLayer(d, layerId, updates))}
            onReorderLayers={(from, to) => updateDoc(d => reorderLayers(d, from, to))}
            onAddLayer={(type, name) => updateDoc(d => addLayer(d, type, name))}
            onDeleteLayer={(layerId) => updateDoc(d => deleteLayer(d, layerId))}
            onSelectLayer={(layerId) => updateDoc(d => setActiveLayer(d, layerId))}
          />
        </Section>

        {/* AI Section */}
        <Section title="AI Generate" icon={<Wand2 className="w-4 h-4 text-purple-400" />} expanded={expandedSections.ai} onToggle={() => toggleSection('ai')}>
          <AiGeneratePanel
            targetWidthMm={doc.artboard.wMm}
            targetHeightMm={doc.artboard.hMm}
            onGenerated={handleAiGenerated}
            onTraceResult={handleTraceResult}
          />
        </Section>

        {/* Pathfinder Section */}
        <Section title="Pathfinder" icon={<Combine className="w-4 h-4 text-purple-400" />} expanded={expandedSections.pathfinder} onToggle={() => toggleSection('pathfinder')}>
          <PathfinderPanel
            doc={doc}
            selectedIds={selectedIds}
            onApplyResult={handlePathfinderResult}
          />
        </Section>

        {/* Align Section */}
        <Section title="Align" icon={<span className="text-blue-400">⫶</span>} expanded={expandedSections.align} onToggle={() => toggleSection('align')}>
          <AlignPanel
            doc={doc}
            selectedIds={selectedIds}
            onApplyDeltas={handleAlignApply}
          />
        </Section>

        {/* Image Trace Section */}
        <Section title="Image Trace" icon={<ImageIcon className="w-4 h-4 text-cyan-400" />} expanded={expandedSections.imageTrace} onToggle={() => toggleSection('imageTrace')}>
          <ImageTracePanel
            targetWidthMm={doc.artboard.wMm}
            targetHeightMm={doc.artboard.hMm}
            onTraceResult={handleTraceResult}
          />
        </Section>

        {/* Ornament Library Section */}
        <Section title="Ornament Library" icon={<Package className="w-4 h-4 text-amber-400" />} expanded={expandedSections.ornaments} onToggle={() => toggleSection('ornaments')}>
          <OrnamentLibraryPanel onInsert={handleOrnamentInsert} />
        </Section>

        {/* Mounting Holes Section */}
        <Section title="Mounting Holes" icon={<Circle className="w-4 h-4 text-green-400" />} expanded={expandedSections.mountingHoles} onToggle={() => toggleSection('mountingHoles')}>
          <MountingHolesPanel
            doc={doc}
            onUpdateHoleConfig={handleUpdateHoleConfig}
            onUpdateHolePosition={handleUpdateHolePosition}
            onAddHole={handleAddHole}
            onDeleteHole={handleDeleteHole}
          />
        </Section>

        {/* Output Section */}
        <Section title="Output Settings" icon={<Settings2 className="w-4 h-4" />} expanded={expandedSections.output} onToggle={() => toggleSection('output')}>
          <div className="space-y-3">
            <NumberInput
              label="Cut Stroke (mm)"
              value={doc.output.cutStrokeMm}
              onChange={(v) => updateDoc(d => ({ ...d, output: { ...d.output, cutStrokeMm: v } }))}
              min={0.01}
              max={0.5}
              step={0.01}
            />
            <NumberInput
              label="Engrave Stroke (mm)"
              value={doc.output.engraveStrokeMm}
              onChange={(v) => updateDoc(d => ({ ...d, output: { ...d.output, engraveStrokeMm: v } }))}
              min={0.01}
              max={1}
              step={0.01}
            />
            <NumberInput
              label="Outline Stroke (mm)"
              value={doc.output.outlineStrokeMm}
              onChange={(v) => updateDoc(d => ({ ...d, output: { ...d.output, outlineStrokeMm: v } }))}
              min={0.01}
              max={0.5}
              step={0.01}
            />
          </div>
        </Section>
      </div>
      </div>

      {/* Canvas Panel */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-slate-950/10">
        {/* Canvas Toolbar */}
        <CanvasToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          zoom={zoom}
          onZoomIn={() => setZoom(z => Math.min(z * 1.2, 10))}
          onZoomOut={() => setZoom(z => Math.max(z / 1.2, 0.1))}
          onFitView={() => setZoom(1)}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onUndo={history.undo}
          onRedo={history.redo}
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid(!showGrid)}
          showSafeZones={showSafeZones}
          onToggleSafeZones={() => setShowSafeZones(!showSafeZones)}
          showGuides={showGuides}
          onToggleGuides={() => setShowGuides(!showGuides)}
          snapEnabled={snapEnabled}
          onToggleSnap={() => setSnapEnabled(!snapEnabled)}
        />

        {/* Action bar */}
        <div className="flex items-center justify-between gap-4 bg-slate-800/50 px-4 py-2 border-b border-slate-700">
          <div className="text-xs text-slate-400">
            {doc.artboard.wMm} × {doc.artboard.hMm} mm
            {selectedIds.length > 0 && (
              <span className="ml-2 text-blue-400">
                • {selectedIds.length} selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm flex items-center gap-1"
              title="Reset"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-500 rounded text-sm font-medium flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export SVG
            </button>
          </div>
        </div>

        {/* Interactive Canvas */}
        <CanvasStage
          doc={doc}
          selection={selection}
          dispatchSelection={dispatchSelection}
          onElementMove={handleElementMove}
          onElementTransform={handleElementTransform}
          onElementsMove={handleElementsMove}
          onInteractionBegin={handleInteractionBegin}
          onInteractionEnd={handleInteractionEnd}
          showGrid={showGrid}
          showSafeZones={showSafeZones}
          showGuides={showGuides}
          activeTool={activeTool}
          snapEnabled={snapEnabled}
          className="flex-1 min-h-[600px]"
        />
      </div>
    </div>
  );
}

// ============ Helper Components ============

function Section({ title, icon, expanded, onToggle, children }: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700">
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center justify-between text-left">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
          {icon}
          {title}
        </span>
        <span className="text-slate-400">{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function NumberInput({ label, value, onChange, min, max, step = 1, className = '' }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && <label className="block text-xs text-slate-400 mb-1">{label}</label>}
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        min={min}
        max={max}
        step={step}
        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm"
      />
    </div>
  );
}

function TextElementEditor({ element, label, onUpdate, onDelete }: {
  element: TextElement;
  label: string;
  onUpdate: (updates: Partial<TextElement>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-2 p-3 bg-slate-900 rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{label}</span>
        <button onClick={onDelete} className="p-1 hover:bg-red-600/30 rounded" title="Delete">
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
        </button>
      </div>

      <input
        type="text"
        value={element.text}
        onChange={(e) => onUpdate({ text: e.target.value })}
        placeholder="Enter text..."
        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm"
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-slate-400 mb-1">Font</label>
          <FontPicker
            value={element.fontId}
            onChange={(fontId) => onUpdate({ fontId })}
          />
        </div>
        <NumberInput
          label="Size (mm)"
          value={element.sizeMm}
          onChange={(v) => onUpdate({ sizeMm: v })}
          min={5}
          max={150}
        />
      </div>

      <div>
        <label className="block text-[10px] text-slate-400 mb-1">Mode</label>
        <select
          value={element.mode}
          onChange={(e) => onUpdate({ mode: e.target.value as any })}
          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs"
        >
          <option value="ENGRAVE_FILLED">Engrave (Filled)</option>
          <option value="CUT_OUTLINE">Cut (Outline)</option>
          <option value="BOTH">Both</option>
        </select>
      </div>

      {/* Outline offset */}
      {(element.mode === 'CUT_OUTLINE' || element.mode === 'BOTH') && (
        <div className="pl-2 border-l-2 border-slate-700 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={element.outline.enabled}
              onChange={(e) => onUpdate({ outline: { ...element.outline, enabled: e.target.checked } })}
              className="rounded"
            />
            <span className="text-[10px] text-slate-400">Add outline offset</span>
          </div>
          {element.outline.enabled && (
            <NumberInput
              label="Offset (mm)"
              value={element.outline.offsetMm}
              onChange={(v) => onUpdate({ outline: { ...element.outline, offsetMm: v } })}
              min={0.5}
              max={10}
              step={0.5}
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <NumberInput
          label="X Offset"
          value={element.transform.xMm}
          onChange={(v) => onUpdate({ transform: { ...element.transform, xMm: v } })}
          min={-500}
          max={500}
        />
        <NumberInput
          label="Y Offset"
          value={element.transform.yMm}
          onChange={(v) => onUpdate({ transform: { ...element.transform, yMm: v } })}
          min={-500}
          max={500}
        />
      </div>
    </div>
  );
}
