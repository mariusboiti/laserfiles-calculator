
'use client';

/**
 * Personalised Sign Generator V3 PRO
 * Layer-based sign designer with interactive canvas, text-to-path, AI generation, and cut/engrave modes
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';

import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';
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
  Element,
  TextElement,
  ShapeElement,
  EngraveSketchElement,
  EngraveImageElement,
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
  findElement,
  moveElementToLayer,
  setActiveLayer,
  findLayerByType,
  createTextElement,
  createShapeElement,
  createOrnamentElement,
  generateId,
} from '../core/layers/model';

import { generateTextOutline, offsetPath as offsetPathOps, translatePathD } from '../core/text/outlineOffset';
import { textElementToCurvedGlyphs, textElementToPath } from '../core/text/textToPath';

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
  setSelection,
  selectionReducer,
} from '../core/canvas/selectionReducer';

import { SHAPE_OPTIONS, LIMITS } from '../config/defaultsV3';
import { ORNATE_LABELS } from '../core/shapes/ornateLabels';

import type { OrnamentId, OrnamentLayerType } from '../../../assets/ornaments';

interface Props {
  featureFlags?: { isProUser?: boolean };
}

export default function PersonalisedSignToolPro({ featureFlags }: Props) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const history = useHistoryReducer<{ doc: SignDocument; selection: SelectionState }>({
    doc: createDefaultDocument(),
    selection: createSelectionState(),
  });
  const editor = history.present;
  const doc = editor.doc;
  const selection = editor.selection;
  const selectedIds = selection.selectedIds;

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
    offset: true,
    ai: false,
    pathfinder: false,
    align: false,
    imageTrace: false,
    ornaments: false,
    mountingHoles: false,
    output: false,
  });

  const [offsetPreviewEnabled, setOffsetPreviewEnabled] = useState(false);
  const [offsetMm, setOffsetMm] = useState(2);
  const [offsetTargetLayerType, setOffsetTargetLayerType] = useState<'CUT' | 'OUTLINE'>('OUTLINE');
  const [offsetPreview, setOffsetPreview] = useState<
    Array<{
      sourceElementId: string;
      sourceKind: 'shape' | 'tracedPath' | 'tracedPathGroup';
      kind: 'path' | 'group';
      svgPathD?: string;
      svgPathDs?: string[];
      transform: { xMm: number; yMm: number; rotateDeg: number; scaleX: number; scaleY: number };
    }>
  >([]);

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

  useEffect(() => {
    if (!offsetPreviewEnabled) {
      setOffsetPreview([]);
      return;
    }
    if (offsetMm <= 0) {
      setOffsetPreview([]);
      return;
    }
    // Use current doc/selection from state, not ref
    const ids = selectedIds;
    if (ids.length === 0) {
      setOffsetPreview([]);
      return;
    }

    let cancelled = false;
    (async () => {
      const items: Array<{
        sourceElementId: string;
        sourceKind: 'shape' | 'tracedPath' | 'tracedPathGroup';
        kind: 'path' | 'group';
        svgPathD?: string;
        svgPathDs?: string[];
        transform: { xMm: number; yMm: number; rotateDeg: number; scaleX: number; scaleY: number };
      }> = [];

      for (const id of ids) {
        const found = findElement(doc, id);
        if (!found) {
          continue;
        }
        const el = found.element as any;

        if (el.kind === 'text' && el.text) {
          // Align using font metrics to match SVG dominantBaseline="middle".
          // 1) Prefer _pathD if present, otherwise generate from font.
          // 2) Align X by bbox + align.
          // 3) Align Y by em-box middle (ascender/descender), not bbox center.
          try {
            const textPath = await textElementToPath(el);
            const basePathD: string = textPath.pathD || '';
            if (basePathD) {
              // SVG textAnchor is based on advance width, not glyph bbox.
              let dx = 0;
              if (el.align === 'right') {
                dx = -textPath.advanceWidthMm;
              } else if (el.align === 'center') {
                dx = -textPath.advanceWidthMm / 2;
              }

              const emMiddleMm = (textPath.ascenderMm + textPath.descenderMm) / 2;
              const dy = -emMiddleMm;

              const alignedPathD = await translatePathD(basePathD, dx, dy);
              const res = await generateTextOutline(alignedPathD, offsetMm);
              if (res.success && res.pathD) {
                items.push({
                  sourceElementId: id,
                  sourceKind: 'shape',
                  kind: 'path',
                  svgPathD: res.pathD,
                  transform: el.transform,
                });
              }
            }
          } catch (err) {
            console.error('[Offset] Text conversion failed:', err);
          }
        } else if (el.kind === 'shape' && el.svgPathD) {
          const res = await generateTextOutline(el.svgPathD, offsetMm);
          if (res.success && res.pathD) {
            items.push({
              sourceElementId: id,
              sourceKind: 'shape',
              kind: 'path',
              svgPathD: res.pathD,
              transform: el.transform,
            });
          }
        } else if (el.kind === 'tracedPath' && el.svgPathD) {
          const res = await offsetPathOps(el.svgPathD, offsetMm);
          if (res.success && res.pathD) {
            items.push({
              sourceElementId: id,
              sourceKind: 'tracedPath',
              kind: 'path',
              svgPathD: res.pathD,
              transform: el.transform,
            });
          }
        } else if (el.kind === 'tracedPathGroup' && Array.isArray(el.svgPathDs)) {
          const ds: string[] = [];
          for (const d of el.svgPathDs) {
            const res = await offsetPathOps(d, offsetMm);
            if (res.success && res.pathD) ds.push(res.pathD);
          }
          if (ds.length > 0) {
            items.push({
              sourceElementId: id,
              sourceKind: 'tracedPathGroup',
              kind: 'group',
              svgPathDs: ds,
              transform: el.transform,
            });
          }
        }
      }

      if (!cancelled) {
        setOffsetPreview(items);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [offsetPreviewEnabled, offsetMm, selectedIds, doc]);

  const handleApplyOffset = useCallback(() => {
    if (offsetPreview.length === 0) {
      return;
    }

    const targetLayer = findLayerByType(doc, offsetTargetLayerType);
    if (!targetLayer) {
      return;
    }
    if (targetLayer.locked) {
      return;
    }

    let nextDoc = doc;
    const newIds: string[] = [];
    for (const item of offsetPreview) {
      const newId = generateId();

      if (item.sourceKind === 'shape' && item.svgPathD) {
        const newEl = {
          id: newId,
          kind: 'shape' as const,
          source: 'builtin' as const,
          svgPathD: item.svgPathD,
          style: 'CUT' as const,
          transform: item.transform,
        };
        nextDoc = addElement(nextDoc, targetLayer.id, newEl);
        newIds.push(newId);
      } else if (item.sourceKind === 'tracedPath' && item.svgPathD) {
        const newEl = {
          id: newId,
          kind: 'tracedPath' as const,
          svgPathD: item.svgPathD,
          strokeMm: 0.3,
          transform: item.transform,
        };
        nextDoc = addElement(nextDoc, targetLayer.id, newEl);
        newIds.push(newId);
      } else if (item.sourceKind === 'tracedPathGroup' && item.svgPathDs && item.svgPathDs.length > 0) {
        const newEl = {
          id: newId,
          kind: 'tracedPathGroup' as const,
          svgPathDs: item.svgPathDs,
          strokeMm: 0.3,
          transform: item.transform,
        };
        nextDoc = addElement(nextDoc, targetLayer.id, newEl);
        newIds.push(newId);
      }
    }

    if (newIds.length === 0) return;
    const nextSelection = selectionReducer(selection, setSelection(newIds));
    setEditor({ doc: nextDoc, selection: nextSelection }, true);
    setOffsetPreviewEnabled(false);
    setOffsetPreview([]);
  }, [offsetPreview, offsetTargetLayerType, doc, selection, setEditor]);

  const canvasRef = useRef<{ fitView: () => void; zoomIn: () => void; zoomOut: () => void } | null>(null);

  // Toggle section
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  React.useEffect(() => {
    const fontIds: string[] = [];
    for (const layer of doc.layers) {
      for (const el of layer.elements) {
        if (el.kind === 'text') {
          fontIds.push(el.fontId);
        }
      }
    }
    void ensureFontsLoaded(Array.from(new Set(fontIds)));
  }, [doc]);

  const textShapeSignature = React.useMemo(() => {
    const signatures: string[] = [];
    for (const layer of doc.layers) {
      for (const el of layer.elements) {
        if (el.kind !== 'text') continue;
        signatures.push(
          [
            el.id,
            el.text,
            el.fontId,
            el.sizeMm,
            el.align,
            el.letterSpacingMm,
            el.lineHeightRatio,
            el.transformCase,
            el.mode,
            el.curvedMode || 'straight',
            el.curvedIntensity ?? 0,
            el.curved?.enabled ? '1' : '0',
            el.curved?.radiusMm ?? '',
            el.curved?.arcDeg ?? '',
            el.curved?.placement ?? '',
            el.curved?.direction ?? '',
          ].join('|')
        );
      }
    }
    return signatures.join(';');
  }, [doc.layers]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const updates: Array<{ id: string; patch: Partial<TextElement> }> = [];

      for (const layer of doc.layers) {
        for (const el of layer.elements) {
          if (el.kind !== 'text') continue;

          const curvedMode = el.curvedMode || 'straight';
          const curvedIntensity = el.curvedIntensity ?? 0;
          const shouldCurve = Boolean(el.curved?.enabled) || (curvedMode !== 'straight' && curvedIntensity > 0);

          try {
            if (shouldCurve) {
              const { glyphs, totalWidthMm } = await textElementToCurvedGlyphs(el);
              if (glyphs.length > 0 && totalWidthMm > 0) {
                const nextBounds = { width: totalWidthMm, height: el.sizeMm * 1.2 };
                const sameGlyphs =
                  Array.isArray(el._curvedGlyphs) &&
                  el._curvedGlyphs.length === glyphs.length &&
                  el._curvedGlyphs.every((g: any, i: number) => g?.d === glyphs[i]?.d && g?.transform === glyphs[i]?.transform);
                const sameBounds = !!el._bounds && el._bounds.width === nextBounds.width && el._bounds.height === nextBounds.height;

                if (!sameGlyphs || el._pathD !== undefined || !sameBounds) {
                  updates.push({
                    id: el.id,
                    patch: {
                      _curvedGlyphs: glyphs,
                      _pathD: undefined,
                      _bounds: nextBounds,
                    },
                  });
                }
              } else {
                if (el._curvedGlyphs !== undefined) {
                  updates.push({
                    id: el.id,
                    patch: { _curvedGlyphs: undefined },
                  });
                }
              }
              continue;
            }

            const textPath = await textElementToPath(el);
            const basePathD: string = textPath.pathD || '';
            if (!basePathD) {
              updates.push({ id: el.id, patch: { _pathD: undefined, _curvedGlyphs: undefined, _bounds: undefined } });
              continue;
            }

            let dx = 0;
            if (el.align === 'right') {
              dx = -textPath.advanceWidthMm;
            } else if (el.align === 'center') {
              dx = -textPath.advanceWidthMm / 2;
            }

            const emMiddleMm = (textPath.ascenderMm + textPath.descenderMm) / 2;
            const dy = -emMiddleMm;

            const alignedPathD = await translatePathD(basePathD, dx, dy);
            const nextBounds = {
              width: textPath.advanceWidthMm,
              height: Math.abs(textPath.ascenderMm - textPath.descenderMm) || el.sizeMm * 1.2,
            };
            const sameBounds = !!el._bounds && el._bounds.width === nextBounds.width && el._bounds.height === nextBounds.height;
            const sameFont = el._fontUsedId === textPath.usedFontId && el._fontUsedFallback === textPath.usedFallback;

            if (el._pathD !== alignedPathD || el._curvedGlyphs !== undefined || !sameBounds || !sameFont) {
              updates.push({
                id: el.id,
                patch: {
                  _pathD: alignedPathD,
                  _curvedGlyphs: undefined,
                  _bounds: nextBounds,
                  _fontUsedId: textPath.usedFontId,
                  _fontUsedFallback: textPath.usedFallback,
                },
              });
            }
          } catch {
            if (el._pathD !== undefined || el._curvedGlyphs !== undefined || el._bounds !== undefined) {
              updates.push({ id: el.id, patch: { _pathD: undefined, _curvedGlyphs: undefined, _bounds: undefined } });
            }
          }
        }
      }

      if (cancelled) return;
      if (updates.length === 0) return;

      updateDoc((d) => {
        let next = d;
        for (const u of updates) {
          next = updateElement(next, u.id, u.patch as any);
        }
        return next;
      }, false);
    })();

    return () => {
      cancelled = true;
    };
  }, [textShapeSignature, updateDoc]);

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
    element: ShapeElement | EngraveSketchElement | Element,
    targetLayer: 'CUT' | 'ENGRAVE'
  ) => {
    const layer = findLayerByType(doc, targetLayer);
    if (!layer) return;

    const cur = editorRef.current;
    const nextDoc = addElement(cur.doc, layer.id, element);
    const nextSelection = selectionReducer(cur.selection, selectSingle(element.id));
    setEditor({ doc: nextDoc, selection: nextSelection }, true);
  }, [doc, setEditor]);

  // Insert image without tracing (as EngraveImage)
  const handleInsertImage = useCallback((element: EngraveImageElement) => {
    const layer = findLayerByType(doc, 'ENGRAVE');
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

  const handleOrnamentDrop = useCallback((payload: {
    assetId: string;
    targetLayer: OrnamentLayerType;
    widthPct: number;
    xMm: number;
    yMm: number;
  }) => {
    const activeLayer = findLayerByType(doc, payload.targetLayer);
    if (!activeLayer) return;

    const targetWidthMm = (doc.artboard.wMm * payload.widthPct) / 100;
    const scale = targetWidthMm / 100;

    const newElement = createOrnamentElement(
      payload.assetId as OrnamentId,
      payload.targetLayer,
      payload.xMm,
      payload.yMm,
      scale
    );

    const cur = editorRef.current;
    const nextDoc = addElement(cur.doc, activeLayer.id, newElement);
    const nextSelection = selectionReducer(cur.selection, selectSingle(newElement.id));
    setEditor({ doc: nextDoc, selection: nextSelection }, true);
  }, [doc, setEditor]);

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

  const handleSelectElement = useCallback(
    (elementId: string) => {
      dispatchSelection(selectSingle(elementId));
    },
    [dispatchSelection]
  );

  const handleMoveElementToLayerType = useCallback(
    (elementId: string, targetLayerType: 'CUT' | 'ENGRAVE') => {
      const cur = editorRef.current;
      const found = findElement(cur.doc, elementId);
      if (!found) return;
      if (found.layer.locked) return;

      const targetLayer = findLayerByType(cur.doc, targetLayerType);
      if (!targetLayer) return;
      if (targetLayer.locked) return;

      let nextDoc = cur.doc;
      if (found.element.kind === 'text') {
        nextDoc = updateElement(nextDoc, elementId, {
          mode: targetLayerType === 'CUT' ? 'CUT_OUTLINE' : 'ENGRAVE_FILLED',
        });
      } else if (found.element.kind === 'shape') {
        nextDoc = updateElement(nextDoc, elementId, {
          style: targetLayerType,
        });
      } else if (found.element.kind === 'ornament') {
        nextDoc = updateElement(nextDoc, elementId, {
          style: {
            ...found.element.style,
            targetLayer: targetLayerType,
          },
        });
      }

      nextDoc = moveElementToLayer(nextDoc, elementId, targetLayer.id);
      const nextSelection = selectionReducer(cur.selection, selectSingle(elementId));
      setEditor({ doc: nextDoc, selection: nextSelection }, true);
    },
    [setEditor]
  );

  const handleDuplicateSelection = useCallback(() => {
    const cur = editorRef.current;
    const ids = cur.selection.selectedIds;
    if (ids.length === 0) return;

    let nextDoc = cur.doc;
    const newIds: string[] = [];
    for (const id of ids) {
      const found = nextDoc.layers.find(l => l.elements.some(e => e.id === id));
      const layer = found;
      const el = layer?.elements.find(e => e.id === id);
      if (!layer || !el) continue;
      if (layer.locked) continue;

      const newId = generateId();
      const cloned: any = {
        ...el,
        id: newId,
        transform: {
          ...el.transform,
          xMm: el.transform.xMm + 5,
          yMm: el.transform.yMm + 5,
        },
      };
      if (cloned.kind === 'tracedPathGroup' && Array.isArray(cloned.svgPathDs)) {
        cloned.svgPathDs = [...cloned.svgPathDs];
      }
      if (cloned.kind === 'engraveSketch' && Array.isArray(cloned.svgPathD)) {
        cloned.svgPathD = [...cloned.svgPathD];
      }

      nextDoc = addElement(nextDoc, layer.id, cloned);
      newIds.push(newId);
    }

    if (newIds.length === 0) return;
    const nextSelection = selectionReducer(cur.selection, setSelection(newIds));
    setEditor({ doc: nextDoc, selection: nextSelection }, true);
  }, [setEditor]);

  const rotateToSnap45 = (deg: number) => Math.round(deg / 45) * 45;

  const handleRotateSelected = useCallback(
    (deltaDeg: number) => {
      const cur = editorRef.current;
      const ids = cur.selection.selectedIds;
      if (ids.length === 0) return;
      updateDoc((d) => {
        let nextDoc = d;
        for (const id of ids) {
          const found = nextDoc.layers.find(l => l.elements.some(e => e.id === id));
          const layer = found;
          const el = layer?.elements.find(e => e.id === id);
          if (!layer || !el) continue;
          if (layer.locked) continue;
          const nextRot = rotateToSnap45((el.transform.rotateDeg || 0) + deltaDeg);
          nextDoc = updateElement(nextDoc, id, { transform: { ...el.transform, rotateDeg: nextRot } });
        }
        return nextDoc;
      }, true);
    },
    [updateDoc]
  );

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
        onDuplicate={handleDuplicateSelection}
      />
      {/* Controls Panel */}
      <div className="w-full lg:w-[400px] lg:min-w-[340px] lg:max-w-[480px] shrink-0 border-r border-slate-800 bg-slate-950/30">
        <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        
        {/* Shape Section */}
        <Section title={t('personalised_sign.pro.ui.section.shape_size')} icon={<Circle className="w-4 h-4" />} expanded={expandedSections.shape} onToggle={() => toggleSection('shape')}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('personalised_sign.pro.ui.shape_type')}</label>
              <select
                value={doc.artboard.baseShape.shapeType}
                onChange={(e) => updateDoc(d => updateBaseShape(d, e.target.value as BaseShapeType))}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm"
              >
                <optgroup label={t('personalised_sign.pro.ui.shape_group.basic')}>
                  {SHAPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </optgroup>
                <optgroup label={t('personalised_sign.pro.ui.shape_group.ornate')}>
                  {ORNATE_LABELS.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <NumberInput
                label={t('personalised_sign.common.width_mm')}
                value={doc.artboard.wMm}
                onChange={(v) => updateDoc(d => updateArtboardSize(d, v, d.artboard.hMm))}
                min={undefined}
                max={LIMITS.width.max}
              />
              <NumberInput
                label={t('personalised_sign.common.height_mm')}
                value={doc.artboard.hMm}
                onChange={(v) => updateDoc(d => updateArtboardSize(d, d.artboard.wMm, v))}
                min={undefined}
                max={LIMITS.height.max}
              />
            </div>

            {['rounded-rect', 'rounded-arch', 'plaque'].includes(doc.artboard.baseShape.shapeType) && (
              <NumberInput
                label={t('personalised_sign.v3.corner_radius')}
                value={doc.artboard.baseShape.cornerRadius}
                onChange={(v) => updateDoc(d => updateBaseShape(d, d.artboard.baseShape.shapeType, v))}
                min={0}
                max={LIMITS.cornerRadius.max}
              />
            )}
          </div>
        </Section>

        {/* Text Section */}
        <Section title={t('personalised_sign.pro.ui.section.text_elements')} icon={<Type className="w-4 h-4" />} expanded={expandedSections.text} onToggle={() => toggleSection('text')}>
          <div className="space-y-4">
            {textElements.map((element, index) => (
              <TextElementEditor
                key={element.id}
                element={element}
                label={`${t('personalised_sign.pro.ui.text.line_label_prefix')} ${element.lineIndex}`}
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
              {t('personalised_sign.pro.ui.text.add_text_element')}
            </button>
          </div>
        </Section>

        {/* Layers Section */}
        <Section title={t('personalised_sign.pro.layers.title')} icon={<LayersIcon className="w-4 h-4" />} expanded={expandedSections.layers} onToggle={() => toggleSection('layers')}>
          <LayerPanel
            document={doc}
            selectedIds={selectedIds}
            onUpdateLayer={(layerId, updates) => updateDoc(d => updateLayer(d, layerId, updates))}
            onReorderLayers={(from, to) => updateDoc(d => reorderLayers(d, from, to))}
            onAddLayer={(type, name) => updateDoc(d => addLayer(d, type, name))}
            onDeleteLayer={(layerId) => updateDoc(d => deleteLayer(d, layerId))}
            onSelectLayer={(layerId) => updateDoc(d => setActiveLayer(d, layerId), false)}
            onSelectElement={handleSelectElement}
            onMoveElementToLayerType={handleMoveElementToLayerType}
          />
        </Section>

        <Section title={t('personalised_sign.pro.ui.section.offset')} icon={<Circle className="w-4 h-4" />} expanded={expandedSections.offset} onToggle={() => toggleSection('offset')}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={offsetPreviewEnabled}
                onChange={(e) => setOffsetPreviewEnabled(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs text-slate-300">{t('personalised_sign.pro.ui.offset.preview_offset')}</span>
            </div>

            <NumberInput
              label={t('personalised_sign.pro.ui.offset.offset_mm')}
              value={offsetMm}
              onChange={(v) => setOffsetMm(v)}
              min={0.5}
              max={20}
              step={0.5}
            />

            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('personalised_sign.pro.ui.offset.target_layer')}</label>
              <select
                value={offsetTargetLayerType}
                onChange={(e) => setOffsetTargetLayerType(e.target.value as 'CUT' | 'OUTLINE')}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm"
              >
                <option value="OUTLINE">{t('personalised_sign.pro.ui.offset.target_layer_option.outline')}</option>
                <option value="CUT">{t('personalised_sign.pro.ui.offset.target_layer_option.cut')}</option>
              </select>
            </div>

            <button
              onClick={handleApplyOffset}
              className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm"
            >
              {t('personalised_sign.pro.ui.offset.apply_offset')}
            </button>
          </div>
        </Section>

        {/* AI Section */}
        <Section title={t('personalised_sign.pro.ui.section.ai_generate')} icon={<Wand2 className="w-4 h-4 text-purple-400" />} expanded={expandedSections.ai} onToggle={() => toggleSection('ai')}>
          <AiGeneratePanel
            targetWidthMm={doc.artboard.wMm}
            targetHeightMm={doc.artboard.hMm}
            onGenerated={handleAiGenerated}
            onTraceResult={handleTraceResult}
            onInsertImage={handleInsertImage}
          />
        </Section>

        {/* Pathfinder Section */}
        <Section title={t('personalised_sign.pro.ui.section.pathfinder')} icon={<Combine className="w-4 h-4 text-purple-400" />} expanded={expandedSections.pathfinder} onToggle={() => toggleSection('pathfinder')}>
          <PathfinderPanel
            doc={doc}
            selectedIds={selectedIds}
            onApplyResult={handlePathfinderResult}
          />
        </Section>

        {/* Align Section */}
        <Section title={t('personalised_sign.pro.align.title')} icon={<span className="text-blue-400">⫶</span>} expanded={expandedSections.align} onToggle={() => toggleSection('align')}>
          <AlignPanel
            doc={doc}
            selectedIds={selectedIds}
            onApplyDeltas={handleAlignApply}
          />
        </Section>

        {/* Image Trace Section */}
        <Section title={t('personalised_sign.pro.image_trace.title')} icon={<ImageIcon className="w-4 h-4 text-cyan-400" />} expanded={expandedSections.imageTrace} onToggle={() => toggleSection('imageTrace')}>
          <ImageTracePanel
            targetWidthMm={doc.artboard.wMm}
            targetHeightMm={doc.artboard.hMm}
            onTraceResult={handleTraceResult}
            onInsertImage={handleInsertImage}
          />
        </Section>

        {/* Ornament Library Section */}
        <Section title={t('personalised_sign.pro.ornaments.title')} icon={<Package className="w-4 h-4 text-amber-400" />} expanded={expandedSections.ornaments} onToggle={() => toggleSection('ornaments')}>
          <OrnamentLibraryPanel onInsert={handleOrnamentInsert} />
        </Section>

        {/* Mounting Holes Section */}
        <Section title={t('personalised_sign.pro.ui.section.mounting_holes')} icon={<Circle className="w-4 h-4 text-green-400" />} expanded={expandedSections.mountingHoles} onToggle={() => toggleSection('mountingHoles')}>
          <MountingHolesPanel
            doc={doc}
            onUpdateHoleConfig={handleUpdateHoleConfig}
            onUpdateHolePosition={handleUpdateHolePosition}
            onAddHole={handleAddHole}
            onDeleteHole={handleDeleteHole}
          />
        </Section>

        {/* Output Section */}
        <Section title={t('personalised_sign.pro.ui.section.output_settings')} icon={<Settings2 className="w-4 h-4" />} expanded={expandedSections.output} onToggle={() => toggleSection('output')}>
          <div className="space-y-3">
            <NumberInput
              label={t('personalised_sign.pro.ui.output.cut_stroke_mm')}
              value={doc.output.cutStrokeMm}
              onChange={(v) => updateDoc(d => ({ ...d, output: { ...d.output, cutStrokeMm: v } }))}
              min={0.01}
              max={0.5}
              step={0.01}
            />
            <NumberInput
              label={t('personalised_sign.pro.ui.output.engrave_stroke_mm')}
              value={doc.output.engraveStrokeMm}
              onChange={(v) => updateDoc(d => ({ ...d, output: { ...d.output, engraveStrokeMm: v } }))}
              min={0.01}
              max={1}
              step={0.01}
            />
            <NumberInput
              label={t('personalised_sign.pro.ui.output.outline_stroke_mm')}
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
          onDuplicate={handleDuplicateSelection}
          onRotateLeft={() => handleRotateSelected(-45)}
          onRotateRight={() => handleRotateSelected(45)}
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
                • {selectedIds.length} {t('personalised_sign.pro.ui.selected')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm flex items-center gap-1"
              title={t('personalised_sign.pro.ui.reset')}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-500 rounded text-sm font-medium flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {t('personalised_sign.common.export_svg')}
            </button>
          </div>
        </div>

        {/* Interactive Canvas */}
        <CanvasStage
          ref={canvasRef as any}
          doc={doc}
          selection={selection}
          dispatchSelection={dispatchSelection}
          onElementMove={handleElementMove}
          onElementTransform={handleElementTransform}
          onElementsMove={handleElementsMove}
          onOrnamentDrop={handleOrnamentDrop}
          offsetPreview={
            offsetPreviewEnabled
              ? offsetPreview.map(({ sourceElementId, kind, svgPathD, svgPathDs, transform }) => ({
                  sourceElementId,
                  kind,
                  svgPathD,
                  svgPathDs,
                  transform,
                }))
              : undefined
          }
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
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  const [text, setText] = React.useState<string>(String(value));

  React.useEffect(() => {
    setText(String(value));
  }, [value]);

  return (
    <div className={className}>
      {label && <label className="block text-xs text-slate-400 mb-1">{label}</label>}
      <input
        type="number"
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          const v = Number(next);
          if (Number.isFinite(v)) onChange(v);
        }}
        onBlur={() => {
          const v = Number(text);
          if (!Number.isFinite(v)) {
            setText(String(value));
            return;
          }
          const clamped = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, v));
          if (clamped !== v) {
            onChange(clamped);
          }
          setText(String(clamped));
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
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  return (
    <div className="space-y-2 p-3 bg-slate-900 rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{label}</span>
        <button onClick={onDelete} className="p-1 hover:bg-red-600/30 rounded" title={t('personalised_sign.pro.ui.text.delete')}>
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
        </button>
      </div>

      <input
        type="text"
        value={element.text}
        onChange={(e) => onUpdate({ text: e.target.value })}
        placeholder={t('personalised_sign.pro.ui.text.placeholder')}
        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm"
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-slate-400 mb-1">{t('personalised_sign.pro.ui.text.font')}</label>
          <FontPicker
            value={element.fontId}
            onChange={(fontId) => onUpdate({ fontId })}
          />
        </div>
        <NumberInput
          label={t('personalised_sign.pro.ui.text.size_mm')}
          value={element.sizeMm}
          onChange={(v) => onUpdate({ sizeMm: v })}
          min={5}
          max={150}
        />
      </div>

      <div>
        <label className="block text-[10px] text-slate-400 mb-1">{t('personalised_sign.pro.ui.text.mode')}</label>
        <select
          value={element.mode}
          onChange={(e) => onUpdate({ mode: e.target.value as any })}
          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs"
        >
          <option value="ENGRAVE_FILLED">{t('personalised_sign.pro.ui.text.mode.engrave_filled')}</option>
          <option value="CUT_OUTLINE">{t('personalised_sign.pro.ui.text.mode.cut_outline')}</option>
          <option value="BOTH">{t('personalised_sign.pro.ui.text.mode.both')}</option>
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
            <span className="text-[10px] text-slate-400">{t('personalised_sign.pro.ui.text.add_outline_offset')}</span>
          </div>
          {element.outline.enabled && (
            <NumberInput
              label={t('personalised_sign.pro.ui.offset.offset_mm')}
              value={element.outline.offsetMm}
              onChange={(v) => onUpdate({ outline: { ...element.outline, offsetMm: v } })}
              min={0.5}
              max={10}
              step={0.5}
            />
          )}
        </div>
      )}

      <div className="pl-2 border-l-2 border-slate-700 space-y-2">
        <div>
          <label className="block text-[10px] text-slate-400 mb-1">{t('personalised_sign.pro.ui.text.curved_text')}</label>
          <select
            value={element.curvedMode || 'straight'}
            onChange={(e) => onUpdate({ curvedMode: e.target.value as any })}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs"
          >
            <option value="straight">{t('personalised_sign.pro.ui.text.curved_mode.straight')}</option>
            <option value="arcUp">{t('personalised_sign.pro.ui.text.curved_mode.arc_up')}</option>
            <option value="arcDown">{t('personalised_sign.pro.ui.text.curved_mode.arc_down')}</option>
          </select>
        </div>

        {(element.curvedMode || 'straight') !== 'straight' && (
          <NumberInput
            label={t('personalised_sign.pro.ui.text.curve_intensity')}
            value={element.curvedIntensity ?? 40}
            onChange={(v) => onUpdate({ curvedIntensity: v })}
            min={0}
            max={100}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberInput
          label={t('personalised_sign.pro.ui.text.x_offset')}
          value={element.transform.xMm}
          onChange={(v) => onUpdate({ transform: { ...element.transform, xMm: v } })}
          min={-500}
          max={500}
        />
        <NumberInput
          label={t('personalised_sign.pro.ui.text.y_offset')}
          value={element.transform.yMm}
          onChange={(v) => onUpdate({ transform: { ...element.transform, yMm: v } })}
          min={-500}
          max={500}
        />
      </div>
    </div>
  );
}
