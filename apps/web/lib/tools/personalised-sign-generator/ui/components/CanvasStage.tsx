'use client';

/**
 * CanvasStage - Interactive SVG canvas for the sign editor
 * Handles pan/zoom, element rendering, selection, and mouse interactions
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { SignDocument, Element, Layer, ElementTransform } from '../../types/signPro';
import type { ViewTransform, PointMm, BoundsMm } from '../../core/canvas/coords';
import {
  createDefaultViewTransform,
  fitToContainer,
  screenToWorld,
  worldToScreen,
  zoomAtPoint,
  DEFAULT_PX_PER_MM,
} from '../../core/canvas/coords';
import {
  getSelectionBounds,
  getAllElementBounds,
  findElementById,
} from '../../core/canvas/selection';
import type { SelectionAction, SelectionState } from '../../core/canvas/selectionReducer';
import { clearSelection, selectSingle, setActive, setMode, setSelection, toggleSelect } from '../../core/canvas/selectionReducer';
import { SelectionOverlay } from './SelectionOverlay';
import { TransformHandles, HandleType } from './TransformHandles';
import { computeHolesPro } from '../../core/holesPro';
import { getCssFontFamily } from '../../../../fonts/fontLoader';
import { getOrnamentById } from '../../../../assets/ornaments';

export type CanvasTool = 'select' | 'pan';

export interface CanvasStageProps {
  doc: SignDocument;
  selection: SelectionState;
  dispatchSelection: React.Dispatch<SelectionAction>;
  onElementMove: (elementId: string, deltaXMm: number, deltaYMm: number) => void;
  onElementTransform: (
    elementId: string,
    transform: { scaleX?: number; scaleY?: number; rotateDeg?: number }
  ) => void;
  onElementsMove: (deltas: Array<{ id: string; deltaXMm: number; deltaYMm: number }>) => void;
  onOrnamentDrop?: (payload: {
    assetId: string;
    targetLayer: 'CUT' | 'ENGRAVE' | 'GUIDE';
    widthPct: number;
    xMm: number;
    yMm: number;
  }) => void;
  onHoleMove?: (holeId: string, xMm: number, yMm: number, commit?: boolean) => void;
  onInteractionBegin?: () => void;
  onInteractionEnd?: () => void;
  showGrid?: boolean;
  showSafeZones?: boolean;
  showGuides?: boolean;
  activeTool?: CanvasTool;
  snapEnabled?: boolean;
  offsetPreview?: Array<{
    sourceElementId: string;
    kind: 'path' | 'group';
    svgPathD?: string;
    svgPathDs?: string[];
    transform: ElementTransform;
  }>;
  className?: string;
}

interface ResizeSession {
  handle: HandleType;
  startWorldX: number;
  startWorldY: number;
  centerWorldX: number;
  centerWorldY: number;
  startMinX: number;
  startMinY: number;
  startMaxX: number;
  startMaxY: number;
  startElements: Array<{
    id: string;
    startXMm: number;
    startYMm: number;
    startScaleX: number;
    startScaleY: number;
    startRotateDeg: number;
  }>;
}

interface DragState {
  type: 'none' | 'pan' | 'pendingMove' | 'move' | 'resize' | 'rotate' | 'hole';
  startX: number;
  startY: number;
  startPan?: { x: number; y: number };
  startTransforms?: Map<string, { xMm: number; yMm: number }>;
  dragStartWorld?: PointMm;
  handle?: HandleType;
  startBounds?: BoundsMm;
  startRotation?: number;
  resizeSession?: ResizeSession;
  holeId?: string;
  startHole?: { xMm: number; yMm: number };
}

interface MarqueeState {
  active: boolean;
  additive: boolean;
  start: PointMm;
  end: PointMm;
  startClientX: number;
  startClientY: number;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const el = target;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  const editableAncestor = el.closest?.('[contenteditable="true"]');
  return Boolean(editableAncestor);
}

// Memoized ornament paths component to prevent re-renders during drag
const OrnamentPaths = React.memo(function OrnamentPaths({
  pathDs,
  strokeColor,
  strokeWidth,
  hitStrokeWidth,
}: {
  pathDs: string[];
  strokeColor: string;
  strokeWidth: number;
  hitStrokeWidth: number;
}) {
  return (
    <g transform="translate(-50, -50)">
      {pathDs.map((pathD, i) => (
        <g key={i}>
          <path d={pathD} fill="transparent" stroke="transparent" strokeWidth={hitStrokeWidth} />
          <path d={pathD} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
        </g>
      ))}
    </g>
  );
});

export const CanvasStage = React.forwardRef<
  { fitView: () => void; zoomIn: () => void; zoomOut: () => void },
  CanvasStageProps
>(function CanvasStage({
  doc,
  selection,
  dispatchSelection,
  onElementMove,
  onElementTransform,
  onElementsMove,
  onOrnamentDrop,
  onHoleMove,
  onInteractionBegin,
  onInteractionEnd,
  showGrid = false,
  showSafeZones = false,
  showGuides = false,
  activeTool = 'select',
  snapEnabled = false,
  offsetPreview,
  className = '',
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const lastMoveDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const queuedMoveDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const moveRafRef = useRef<number | null>(null);
  const movePreviewDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [movePreviewDelta, setMovePreviewDelta] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const [viewTransform, setViewTransform] = useState<ViewTransform>(createDefaultViewTransform);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [dragState, setDragState] = useState<DragState>({ type: 'none', startX: 0, startY: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [marquee, setMarquee] = useState<MarqueeState | null>(null);

  useEffect(() => {
    return () => {
      if (moveRafRef.current !== null) {
        cancelAnimationFrame(moveRafRef.current);
        moveRafRef.current = null;
      }
    };
  }, []);

  const renderOffsetPreview = () => {
    if (!offsetPreview || offsetPreview.length === 0) return null;
    return (
      <g opacity={0.9} pointerEvents="none">
        {offsetPreview.map((item) => {
          const t = item.transform;
          const transformStr = `translate(${t.xMm}, ${t.yMm}) rotate(${t.rotateDeg}) scale(${t.scaleX}, ${t.scaleY})`;
          if (item.kind === 'group') {
            const ds = item.svgPathDs ?? [];
            return (
              <g key={item.sourceElementId} transform={transformStr}>
                {ds.map((d, idx) => (
                  <path
                    key={idx}
                    d={d}
                    fill="none"
                    stroke="#7c3aed"
                    strokeWidth={0.3}
                    strokeDasharray="3,2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </g>
            );
          }
          if (!item.svgPathD) return null;
          return (
            <path
              key={item.sourceElementId}
              d={item.svgPathD}
              transform={transformStr}
              fill="none"
              stroke="#7c3aed"
              strokeWidth={0.3}
              strokeDasharray="3,2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </g>
    );
  };

  const { wMm, hMm } = doc.artboard;

  const allElementBounds = useMemo(() => getAllElementBounds(doc), [doc]);

  const selectedIds = selection.selectedIds;


  // Get container rect
  const getContainerRect = useCallback(() => {
    return containerRef.current?.getBoundingClientRect() ?? new DOMRect();
  }, []);

  // Convert client coords to world mm
  const clientToWorld = useCallback(
    (clientX: number, clientY: number): PointMm => {
      const rect = getContainerRect();
      return screenToWorld(clientX, clientY, rect, viewTransform);
    },
    [viewTransform, getContainerRect]
  );

  const handleHolePointerDown = useCallback((e: React.PointerEvent, holeId: string, cx: number, cy: number) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    if (onInteractionBegin) onInteractionBegin();

    setDragState({
      type: 'hole',
      startX: e.clientX,
      startY: e.clientY,
      dragStartWorld: clientToWorld(e.clientX, e.clientY),
      holeId,
      startHole: { xMm: cx, yMm: cy },
    });

    e.currentTarget.setPointerCapture(e.pointerId);
  }, [clientToWorld, onInteractionBegin]);

  const renderHoles = useCallback(() => {
    const holes = computeHolesPro(doc);
    const cut = holes.cut;
    const engrave = holes.engrave;

    return (
      <>
        {cut.map((h, idx) => {
          if (h.kind === 'circle') {
            return (
              <g key={`hole-cut-c-${idx}`}>
                {/* Visual hole */}
                <circle
                  cx={h.cx}
                  cy={h.cy}
                  r={h.r}
                  fill="none"
                  stroke="#ff0000"
                  strokeWidth={0.2}
                />
                {/* Interactive handle (invisible larger target) */}
                {h.id && doc.holes.mode === 'custom' && (
                  <circle
                    cx={h.cx}
                    cy={h.cy}
                    r={Math.max(h.r, 3)}
                    fill="transparent"
                    stroke="transparent"
                    style={{ cursor: 'move' }}
                    onPointerDown={(e) => handleHolePointerDown(e, h.id!, h.cx, h.cy)}
                  />
                )}
                {/* Selection ring if needed - currently holes are not "selected" in the same way as elements */}
              </g>
            );
          }
          return (
            <path
              key={`hole-cut-p-${idx}`}
              d={h.d}
              fill="none"
              stroke="#ff0000"
              strokeWidth={0.2}
            />
          );
        })}

        {engrave.map((h, idx) => {
          if (h.kind === 'circle') {
            return (
              <circle
                key={`hole-eng-c-${idx}`}
                cx={h.cx}
                cy={h.cy}
                r={h.r}
                fill="none"
                stroke="#ff0000"
                strokeWidth={0.2}
              />
            );
          }
          return (
            <path
              key={`hole-eng-p-${idx}`}
              d={h.d}
              fill="none"
              stroke="#ff0000"
              strokeWidth={0.2}
            />
          );
        })}
      </>
    );
  }, [doc, handleHolePointerDown]);

  // Observe container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Fit to container on mount and when artboard changes
  useEffect(() => {
    if (containerSize.width > 0 && containerSize.height > 0) {
      const fitted = fitToContainer(wMm, hMm, containerSize.width, containerSize.height);
      setViewTransform(fitted);
    }
  }, [wMm, hMm, containerSize.width, containerSize.height]);

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't steal Space while the user is typing in an input.
      if (isEditableTarget(e.target)) return;

      if (e.code === 'Space' && !isSpacePressed) {
        setIsSpacePressed(true);
        e.preventDefault();
      }

      // Select all (Cmd/Ctrl+A)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const ids: string[] = [];
        for (const layer of doc.layers) {
          if (!layer.visible) continue;
          if (layer.locked) continue;
          for (const el of layer.elements) {
            ids.push(el.id);
          }
        }
        dispatchSelection(setSelection(ids));
        return;
      }

      // Escape clears selection
      if (e.key === 'Escape') {
        e.preventDefault();
        dispatchSelection(clearSelection());
        return;
      }

      // Arrow key nudge
      if (selectedIds.length > 0 && !e.repeat) {
        let nudgeMm = 1; // Default 1mm
        if (e.shiftKey) nudgeMm = 0.1;
        if (e.altKey) nudgeMm = 5;

        let deltaX = 0;
        let deltaY = 0;

        switch (e.key) {
          case 'ArrowLeft':
            deltaX = -nudgeMm;
            break;
          case 'ArrowRight':
            deltaX = nudgeMm;
            break;
          case 'ArrowUp':
            deltaY = -nudgeMm;
            break;
          case 'ArrowDown':
            deltaY = nudgeMm;
            break;
          default:
            return;
        }

        e.preventDefault();

        if (onInteractionBegin) {
          onInteractionBegin();
        }
        
        const deltas: Array<{ id: string; deltaXMm: number; deltaYMm: number }> = [];
        let skippedLocked = false;
        for (const id of selectedIds) {
          const found = findElementById(doc, id);
          if (!found) continue;
          if (found.layer.locked) {
            skippedLocked = true;
            continue;
          }
          deltas.push({ id, deltaXMm: deltaX, deltaYMm: deltaY });
        }
        if (skippedLocked) {
          console.warn('Some locked items skipped');
        }
        if (deltas.length > 0) {
          onElementsMove(deltas);
        }

        if (onInteractionEnd) {
          onInteractionEnd();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSpacePressed, selectedIds, onElementsMove, doc, dispatchSelection, onInteractionBegin, onInteractionEnd]);

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      const rect = getContainerRect();
      const centerX = e.clientX - rect.left;
      const centerY = e.clientY - rect.top;

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = viewTransform.zoom * zoomFactor;

      setViewTransform(zoomAtPoint(viewTransform, newZoom, centerX, centerY));
    },
    [viewTransform, getContainerRect]
  );

  // Handle pointer down
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 && e.button !== 1) return;

      const isPanning = activeTool === 'pan' || isSpacePressed || e.button === 1;

      if (isPanning) {
        // Start pan
        setDragState({
          type: 'pan',
          startX: e.clientX,
          startY: e.clientY,
          startPan: { x: viewTransform.panX, y: viewTransform.panY },
        });
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      // Empty-canvas pointerdown: start potential marquee. Activation happens after movement threshold.
      const additive = e.shiftKey || e.metaKey || e.ctrlKey;
      const start = clientToWorld(e.clientX, e.clientY);
      setMarquee({
        active: false,
        additive,
        start,
        end: start,
        startClientX: e.clientX,
        startClientY: e.clientY,
      });
      
      // Reset dragState to ensure clean state for marquee
      setDragState({ type: 'none', startX: e.clientX, startY: e.clientY });

      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [activeTool, isSpacePressed, viewTransform, clientToWorld]
  );

  // Handle pointer move
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (marquee && dragState.type === 'none' && selection.mode !== 'dragging') {
        const dx = e.clientX - marquee.startClientX;
        const dy = e.clientY - marquee.startClientY;
        const distSq = dx * dx + dy * dy;

        if (distSq >= 9) {
          // Activate marquee locally and also update selection mode for other parts of the UI.
          if (!marquee.active) {
            dispatchSelection(setMode('marquee'));
            setMarquee(prev => (prev ? { ...prev, active: true } : prev));
          }

          const world = clientToWorld(e.clientX, e.clientY);
          setMarquee(prev => (prev ? { ...prev, end: world } : prev));
        }
      }

      if (dragState.type === 'pendingMove' && dragState.startTransforms) {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        const distSq = dx * dx + dy * dy;
        if (distSq < 9) {
          return;
        }

        if (onInteractionBegin) {
          onInteractionBegin();
        }
        dispatchSelection(setMode('dragging'));

        setDragState(prev => ({
          ...prev,
          type: 'move',
          dragStartWorld: clientToWorld(e.clientX, e.clientY),
        }));
        lastMoveDeltaRef.current = { x: 0, y: 0 };
        queuedMoveDeltaRef.current = { x: 0, y: 0 };
        movePreviewDeltaRef.current = { x: 0, y: 0 };
        // Don't call setMovePreviewDelta here - avoid triggering re-renders
        return;
      }

      if (dragState.type === 'none') return;

      const deltaX = e.clientX - dragState.startX;
      const deltaY = e.clientY - dragState.startY;

      if (dragState.type === 'pan' && dragState.startPan) {
        setViewTransform(prev => ({
          ...prev,
          panX: dragState.startPan!.x + deltaX,
          panY: dragState.startPan!.y + deltaY,
        }));
      } else if (dragState.type === 'hole' && dragState.startHole && dragState.holeId && onHoleMove) {
        if (!dragState.dragStartWorld) return;
        const currentWorld = clientToWorld(e.clientX, e.clientY);
        const deltaMmX = currentWorld.xMm - dragState.dragStartWorld.xMm;
        const deltaMmY = currentWorld.yMm - dragState.dragStartWorld.yMm;

        // Apply snap if enabled (grid 5mm)
        let snappedDeltaX = deltaMmX;
        let snappedDeltaY = deltaMmY;
        if (snapEnabled) {
          snappedDeltaX = Math.round(deltaMmX / 5) * 5;
          snappedDeltaY = Math.round(deltaMmY / 5) * 5;
        }

        const newX = dragState.startHole.xMm + snappedDeltaX;
        const newY = dragState.startHole.yMm + snappedDeltaY;

        onHoleMove(dragState.holeId, newX, newY, false);
      } else if (dragState.type === 'move' && dragState.startTransforms) {
        if (!dragState.dragStartWorld) return;
        const currentWorld = clientToWorld(e.clientX, e.clientY);
        const deltaMmX = currentWorld.xMm - dragState.dragStartWorld.xMm;
        const deltaMmY = currentWorld.yMm - dragState.dragStartWorld.yMm;

        // Apply snap if enabled
        let snappedDeltaX = deltaMmX;
        let snappedDeltaY = deltaMmY;

        if (snapEnabled) {
          // Snap to grid (5mm)
          snappedDeltaX = Math.round(deltaMmX / 5) * 5;
          snappedDeltaY = Math.round(deltaMmY / 5) * 5;
        }

        // Smooth drag preview: update local preview delta (no doc mutations per frame)
        const last = lastMoveDeltaRef.current;
        const incX = snappedDeltaX - last.x;
        const incY = snappedDeltaY - last.y;
        if (Math.abs(incX) < 1e-6 && Math.abs(incY) < 1e-6) return;

        lastMoveDeltaRef.current = { x: snappedDeltaX, y: snappedDeltaY };
        queuedMoveDeltaRef.current = {
          x: queuedMoveDeltaRef.current.x + incX,
          y: queuedMoveDeltaRef.current.y + incY,
        };

        if (moveRafRef.current === null) {
          moveRafRef.current = requestAnimationFrame(() => {
            moveRafRef.current = null;
            const q = queuedMoveDeltaRef.current;
            queuedMoveDeltaRef.current = { x: 0, y: 0 };
            if (Math.abs(q.x) < 1e-9 && Math.abs(q.y) < 1e-9) return;
            movePreviewDeltaRef.current = {
              x: movePreviewDeltaRef.current.x + q.x,
              y: movePreviewDeltaRef.current.y + q.y,
            };
            
            // DIRECT DOM MANIPULATION - bypass React re-renders during drag
            if (svgRef.current && dragState.startTransforms) {
              const deltaXMm = movePreviewDeltaRef.current.x;
              const deltaYMm = movePreviewDeltaRef.current.y;
              
              // Move SVG elements using mm (SVG uses mm coordinate system)
              const translateMm = `translate(${deltaXMm}, ${deltaYMm})`;
              for (const [id] of dragState.startTransforms) {
                const el = svgRef.current.querySelector(`[data-element-id="${id}"]`) as SVGGElement | null;
                if (el) {
                  el.style.transform = translateMm;
                }
              }
              
              // Move selection overlay using pixels (HTML element in screen space)
              const pxPerMm = DEFAULT_PX_PER_MM * viewTransform.zoom;
              const translatePx = `translate(${deltaXMm * pxPerMm}px, ${deltaYMm * pxPerMm}px)`;
              const selectionOverlay = containerRef.current?.querySelector('[data-selection-overlay="true"]') as HTMLDivElement | null;
              if (selectionOverlay) {
                selectionOverlay.style.transform = translatePx;
              }
            }
          });
        }
      }
    },
    [marquee, clientToWorld, dragState, viewTransform, snapEnabled, doc, onElementsMove, dispatchSelection, selection.mode, onInteractionBegin]
  );

  // Handle pointer up
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}

      if (moveRafRef.current !== null) {
        cancelAnimationFrame(moveRafRef.current);
        moveRafRef.current = null;
      }
      queuedMoveDeltaRef.current = { x: 0, y: 0 };
      lastMoveDeltaRef.current = { x: 0, y: 0 };

      // Click-only element interaction (pendingMove never activated)
      if (dragState.type === 'pendingMove') {
        setDragState({ type: 'none', startX: 0, startY: 0 });
        setMarquee(null);
        return;
      }

      if (marquee?.active) {
        const x1 = Math.min(marquee.start.xMm, marquee.end.xMm);
        const y1 = Math.min(marquee.start.yMm, marquee.end.yMm);
        const x2 = Math.max(marquee.start.xMm, marquee.end.xMm);
        const y2 = Math.max(marquee.start.yMm, marquee.end.yMm);


        const hits: string[] = [];
        for (const eb of allElementBounds) {
          const b = eb.bounds;
          const bx2 = b.xMm + b.widthMm;
          const by2 = b.yMm + b.heightMm;
          const overlaps = !(bx2 < x1 || b.xMm > x2 || by2 < y1 || b.yMm > y2);
          if (overlaps) {
            hits.push(eb.elementId);
          }
        }


        const next = marquee.additive
          ? [...selectedIds, ...hits.filter(id => !selectedIds.includes(id))]
          : hits;
        // Dispatch selection - do NOT dispatch setMode here because editorRef.current
        // doesn't update between dispatches, causing the second dispatch to overwrite
        // the selection with stale state.
        dispatchSelection(setSelection(next));
        
        // Reset local state and return early
        setMarquee(null);
        setDragState({ type: 'none', startX: 0, startY: 0 });
        return;
      }

      // Empty canvas click (no marquee activated)
      if (!marquee?.active && marquee) {
        if (!marquee.additive) {
          dispatchSelection(clearSelection());
        }
      }

      if (selection.mode === 'marquee') {
        dispatchSelection(setMode('idle'));
      }

      if (selection.mode === 'dragging') {
        dispatchSelection(setMode('idle'));

        // Commit move once at end (prevents flicker while dragging)
        if (dragState.type === 'move' && dragState.startTransforms) {
          const delta = movePreviewDeltaRef.current;
          
          // Clear CSS transforms on DOM elements before committing
          if (svgRef.current) {
            for (const [id] of dragState.startTransforms) {
              const el = svgRef.current.querySelector(`[data-element-id="${id}"]`) as SVGGElement | null;
              if (el) {
                el.style.transform = '';
              }
            }
          }
          
          // Clear transform on selection overlay
          if (containerRef.current) {
            const selectionOverlay = containerRef.current.querySelector('[data-selection-overlay="true"]') as HTMLDivElement | null;
            if (selectionOverlay) {
              selectionOverlay.style.transform = '';
            }
          }
          
          if (Math.abs(delta.x) > 1e-9 || Math.abs(delta.y) > 1e-9) {
            const deltas: Array<{ id: string; deltaXMm: number; deltaYMm: number }> = [];
            for (const [id] of dragState.startTransforms) {
              deltas.push({ id, deltaXMm: delta.x, deltaYMm: delta.y });
            }
            onElementsMove(deltas);
          }
        }

        movePreviewDeltaRef.current = { x: 0, y: 0 };
        setMovePreviewDelta({ x: 0, y: 0 });

        if (onInteractionEnd) {
          onInteractionEnd();
        }
      }

      if (dragState.type === 'resize' || dragState.type === 'rotate') {
        if (onInteractionEnd) {
          onInteractionEnd();
        }
      }

      setMarquee(null);
      setDragState({ type: 'none', startX: 0, startY: 0 });
    },
    [selection.mode, marquee, allElementBounds, selectedIds, dispatchSelection, onInteractionEnd, dragState.type, dragState.startTransforms, onElementsMove]
  );

  const handleElementPointerDown = useCallback(
    (e: React.PointerEvent, elementId: string, layerId: string) => {
      if (e.button !== 0) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const layer = doc.layers.find(l => l.id === layerId);
      const isLayerLocked = !!layer?.locked;

      const isToggle = e.shiftKey || e.metaKey || e.ctrlKey;
      const isAlreadySelected = selectedIds.includes(elementId);

      if (isToggle) {
        dispatchSelection(toggleSelect(elementId));
        return;
      }

      if (!isAlreadySelected) {
        dispatchSelection(selectSingle(elementId));
      } else {
        dispatchSelection(setActive(elementId));
      }

      if (isLayerLocked) {
        console.warn('Layer is locked');
        return;
      }

      // Prepare move drag (activate only after threshold)
      const idsToMove = isAlreadySelected ? selectedIds : [elementId];
      const startTransforms = new Map<string, { xMm: number; yMm: number }>();
      let skippedLocked = false;

      for (const id of idsToMove) {
        const found = findElementById(doc, id);
        if (!found) continue;
        if (found.layer.locked) {
          skippedLocked = true;
          continue;
        }
        startTransforms.set(id, { xMm: found.element.transform.xMm, yMm: found.element.transform.yMm });
      }

      if (skippedLocked) {
        console.warn('Some locked items skipped');
      }

      if (startTransforms.size === 0) {
        return;
      }

      setDragState({
        type: 'pendingMove',
        startX: e.clientX,
        startY: e.clientY,
        dragStartWorld: clientToWorld(e.clientX, e.clientY),
        startTransforms,
      });

      lastMoveDeltaRef.current = { x: 0, y: 0 };
      queuedMoveDeltaRef.current = { x: 0, y: 0 };
      movePreviewDeltaRef.current = { x: 0, y: 0 };
      // Don't call setMovePreviewDelta here - avoid triggering re-renders

      containerRef.current?.setPointerCapture(e.pointerId);
    },
    [doc, selectedIds, dispatchSelection, onInteractionBegin, clientToWorld]
  );

  // Handle resize/rotate from transform handles
  const handleHandleStart = useCallback(
    (handle: HandleType, e: React.PointerEvent) => {
      const bounds = getSelectionBounds(selectedIds, doc);
      if (!bounds) return;

      if (onInteractionBegin) {
        onInteractionBegin();
      }

      if (handle === 'rotate') {
        // Get current rotation of first selected element
        let startRotation = 0;
        for (const layer of doc.layers) {
          const el = layer.elements.find(e => selectedIds.includes(e.id));
          if (el) {
            startRotation = el.transform.rotateDeg;
            break;
          }
        }

        setDragState({
          type: 'rotate',
          startX: e.clientX,
          startY: e.clientY,
          handle,
          startBounds: bounds,
          startRotation,
        });
      } else {
        // Resize: capture world-coordinate snapshot
        const worldPoint = clientToWorld(e.clientX, e.clientY);
        const centerX = bounds.xMm + bounds.widthMm / 2;
        const centerY = bounds.yMm + bounds.heightMm / 2;
        const minX = bounds.xMm;
        const minY = bounds.yMm;
        const maxX = bounds.xMm + bounds.widthMm;
        const maxY = bounds.yMm + bounds.heightMm;

        const startElements: ResizeSession['startElements'] = [];
        for (const id of selectedIds) {
          const found = findElementById(doc, id);
          if (!found || found.layer.locked) continue;
          const t = found.element.transform;
          startElements.push({
            id,
            startXMm: t.xMm,
            startYMm: t.yMm,
            startScaleX: t.scaleX,
            startScaleY: t.scaleY,
            startRotateDeg: t.rotateDeg,
          });
        }

        const resizeSession: ResizeSession = {
          handle,
          startWorldX: worldPoint.xMm,
          startWorldY: worldPoint.yMm,
          centerWorldX: centerX,
          centerWorldY: centerY,
          startMinX: minX,
          startMinY: minY,
          startMaxX: maxX,
          startMaxY: maxY,
          startElements,
        };

        setDragState({
          type: 'resize',
          startX: e.clientX,
          startY: e.clientY,
          handle,
          startBounds: bounds,
          resizeSession,
        });
      }
    },
    [selectedIds, doc, onInteractionBegin, clientToWorld]
  );

  const handleHandleMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragState.type !== 'resize' && dragState.type !== 'rotate') return;
      if (!dragState.startBounds) return;

      const bounds = dragState.startBounds;
      const centerX = bounds.xMm + bounds.widthMm / 2;
      const centerY = bounds.yMm + bounds.heightMm / 2;

      if (dragState.type === 'rotate') {
        const worldPoint = clientToWorld(e.clientX, e.clientY);
        const angle = Math.atan2(worldPoint.yMm - centerY, worldPoint.xMm - centerX) * (180 / Math.PI);
        
        let newRotation = angle + 90;
        
        if (e.shiftKey) {
          newRotation = Math.round(newRotation / 15) * 15;
        }

        let skippedLocked = false;
        for (const id of selectedIds) {
          const found = findElementById(doc, id);
          if (!found) continue;
          if (found.layer.locked) {
            skippedLocked = true;
            continue;
          }
          onElementTransform(id, { rotateDeg: newRotation });
        }
        if (skippedLocked) {
          console.warn('Some locked items were skipped');
        }
      } else if (dragState.type === 'resize' && dragState.resizeSession) {
        const session = dragState.resizeSession;
        const worldPoint = clientToWorld(e.clientX, e.clientY);
        const handle = session.handle;
        const fromCenter = e.altKey;
        const keepAspect = e.shiftKey;

        const W0 = session.startMaxX - session.startMinX;
        const H0 = session.startMaxY - session.startMinY;
        const aspect = W0 / H0;

        let newMinX = session.startMinX;
        let newMinY = session.startMinY;
        let newMaxX = session.startMaxX;
        let newMaxY = session.startMaxY;

        if (fromCenter) {
          const dx = worldPoint.xMm - session.startWorldX;
          const dy = worldPoint.yMm - session.startWorldY;

          if (handle.includes('e')) {
            newMaxX = session.startMaxX + dx;
            newMinX = session.startMinX - dx;
          } else if (handle.includes('w')) {
            newMinX = session.startMinX + dx;
            newMaxX = session.startMaxX - dx;
          }

          if (handle.includes('s')) {
            newMaxY = session.startMaxY + dy;
            newMinY = session.startMinY - dy;
          } else if (handle.includes('n')) {
            newMinY = session.startMinY + dy;
            newMaxY = session.startMaxY - dy;
          }
        } else {
          if (handle.includes('e')) {
            newMaxX = worldPoint.xMm;
          } else if (handle.includes('w')) {
            newMinX = worldPoint.xMm;
          }

          if (handle.includes('s')) {
            newMaxY = worldPoint.yMm;
          } else if (handle.includes('n')) {
            newMinY = worldPoint.yMm;
          }
        }

        let newW = newMaxX - newMinX;
        let newH = newMaxY - newMinY;

        if (keepAspect) {
          const absDx = Math.abs(worldPoint.xMm - session.startWorldX);
          const absDy = Math.abs(worldPoint.yMm - session.startWorldY);

          if (absDx > absDy) {
            newH = newW / aspect;
            if (handle.includes('n')) {
              newMinY = newMaxY - newH;
            } else if (handle.includes('s')) {
              newMaxY = newMinY + newH;
            } else {
              const centerY = (newMinY + newMaxY) / 2;
              newMinY = centerY - newH / 2;
              newMaxY = centerY + newH / 2;
            }
          } else {
            newW = newH * aspect;
            if (handle.includes('w')) {
              newMinX = newMaxX - newW;
            } else if (handle.includes('e')) {
              newMaxX = newMinX + newW;
            } else {
              const centerX = (newMinX + newMaxX) / 2;
              newMinX = centerX - newW / 2;
              newMaxX = centerX + newW / 2;
            }
          }
        }

        newW = newMaxX - newMinX;
        newH = newMaxY - newMinY;

        if (newW < 1 || newH < 1) return;

        let sx = newW / W0;
        let sy = newH / H0;

        sx = Math.max(0.05, Math.min(20, sx));
        sy = Math.max(0.05, Math.min(20, sy));

        const anchorMap: Record<HandleType, { x: number; y: number }> = {
          se: { x: session.startMinX, y: session.startMinY },
          nw: { x: session.startMaxX, y: session.startMaxY },
          ne: { x: session.startMinX, y: session.startMaxY },
          sw: { x: session.startMaxX, y: session.startMinY },
          e: { x: session.startMinX, y: session.centerWorldY },
          w: { x: session.startMaxX, y: session.centerWorldY },
          s: { x: session.centerWorldX, y: session.startMinY },
          n: { x: session.centerWorldX, y: session.startMaxY },
          rotate: { x: session.centerWorldX, y: session.centerWorldY },
        };

        const anchor = fromCenter
          ? { x: session.centerWorldX, y: session.centerWorldY }
          : anchorMap[handle];

        for (const el of session.startElements) {
          const vx = el.startXMm - anchor.x;
          const vy = el.startYMm - anchor.y;

          const newX = anchor.x + vx * sx;
          const newY = anchor.y + vy * sy;
          const newScaleX = el.startScaleX * sx;
          const newScaleY = el.startScaleY * sy;

          const found = findElementById(doc, el.id);
          if (!found || found.layer.locked) continue;

          const currentTransform = found.element.transform;
          const deltaX = newX - currentTransform.xMm;
          const deltaY = newY - currentTransform.yMm;
          
          if (
            Math.abs(deltaX) > 0.001 ||
            Math.abs(deltaY) > 0.001 ||
            Math.abs(currentTransform.scaleX - newScaleX) > 0.001 ||
            Math.abs(currentTransform.scaleY - newScaleY) > 0.001
          ) {
            onElementMove(el.id, deltaX, deltaY);
            onElementTransform(el.id, { scaleX: newScaleX, scaleY: newScaleY });
          }
        }
      }
    },
    [dragState, selectedIds, clientToWorld, onElementTransform, onElementMove, doc]
  );

  // Selection bounds for overlay
  const selectionBounds = useMemo(
    () => getSelectionBounds(selectedIds, doc),
    [selectedIds, doc]
  );

  const selectionBoundsWithPreview = useMemo(() => {
    if (!selectionBounds) return null;
    if (dragState.type !== 'move' && dragState.type !== 'pendingMove') return selectionBounds;
    if (Math.abs(movePreviewDelta.x) < 1e-9 && Math.abs(movePreviewDelta.y) < 1e-9) return selectionBounds;
    return {
      ...selectionBounds,
      xMm: selectionBounds.xMm + movePreviewDelta.x,
      yMm: selectionBounds.yMm + movePreviewDelta.y,
    };
  }, [selectionBounds, dragState.type, movePreviewDelta]);

  // Fit view callback
  const fitView = useCallback(() => {
    const fitted = fitToContainer(wMm, hMm, containerSize.width, containerSize.height);
    setViewTransform(fitted);
  }, [wMm, hMm, containerSize]);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setViewTransform(prev => ({
      ...prev,
      zoom: Math.min(prev.zoom * 1.2, 10),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setViewTransform(prev => ({
      ...prev,
      zoom: Math.max(prev.zoom / 1.2, 0.1),
    }));
  }, []);

  // Expose methods via ref
  React.useImperativeHandle(ref, () => ({
    fitView,
    zoomIn,
    zoomOut,
  }), [fitView, zoomIn, zoomOut]);

  // Render grid
  const renderGrid = () => {
    if (!showGrid) return null;
    
    const gridSize = 10; // 10mm grid
    const lines: JSX.Element[] = [];

    for (let x = 0; x <= wMm; x += gridSize) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={hMm}
          stroke="#e5e7eb"
          strokeWidth={0.2}
        />
      );
    }

    for (let y = 0; y <= hMm; y += gridSize) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={wMm}
          y2={y}
          stroke="#e5e7eb"
          strokeWidth={0.2}
        />
      );
    }

    return <g className="grid">{lines}</g>;
  };

  // Render safe zones
  const renderSafeZones = () => {
    if (!showSafeZones) return null;
    
    const margin = 15; // 15mm safe zone
    return (
      <rect
        x={margin}
        y={margin}
        width={wMm - margin * 2}
        height={hMm - margin * 2}
        fill="none"
        stroke="#10b981"
        strokeWidth={0.3}
        strokeDasharray="5,5"
      />
    );
  };

  // Render guides (center lines)
  const renderGuides = () => {
    if (!showGuides) return null;
    
    return (
      <g className="guides">
        <line
          x1={wMm / 2}
          y1={0}
          x2={wMm / 2}
          y2={hMm}
          stroke="#f59e0b"
          strokeWidth={0.2}
          strokeDasharray="3,3"
        />
        <line
          x1={0}
          y1={hMm / 2}
          x2={wMm}
          y2={hMm / 2}
          stroke="#f59e0b"
          strokeWidth={0.2}
          strokeDasharray="3,3"
        />
      </g>
    );
  };

  // Render element based on type
  const renderElement = (element: Element, layer: Layer) => {
    const isSelected = selectedIds.includes(element.id);
    const transform = element.transform;

    // SVG transform - position from document
    const transformStr = `translate(${transform.xMm}, ${transform.yMm}) rotate(${transform.rotateDeg}) scale(${transform.scaleX}, ${transform.scaleY})`;

    // Note: CSS transform for drag preview is applied directly to DOM in handlePointerMove
    // This eliminates React re-renders during drag for maximum performance
    const baseProps = {
      'data-element-id': element.id,
      'data-layer-id': layer.id,
      transform: transformStr,
      style: { cursor: layer.locked ? 'not-allowed' : 'move' } as React.CSSProperties,
      className: isSelected ? 'selected' : '',
    };

    const layerType = layer.type;
    const isEngraveLayer = layerType === 'ENGRAVE';
    const strokeColor = layerType === 'GUIDE' ? '#00ff00' : '#000';
    const hitStrokeWidth = 6;

    switch (element.kind) {
      case 'text': {
        // Render text as curved glyphs if available, otherwise as path, otherwise as text
        if (element._curvedGlyphs && element._curvedGlyphs.length > 0) {
          return (
            <g key={element.id} {...baseProps} onPointerDown={(e) => handleElementPointerDown(e, element.id, layer.id)}>
              {element._curvedGlyphs.map((g, i) => (
                <g key={i} transform={g.transform}>
                  <path d={g.d} fill="transparent" stroke="transparent" strokeWidth={hitStrokeWidth} />
                  <path
                    d={g.d}
                    fill={isEngraveLayer || element.mode === 'ENGRAVE_FILLED' ? '#000' : 'none'}
                    stroke={element.mode === 'CUT_OUTLINE' ? strokeColor : 'none'}
                    strokeWidth={0.3}
                  />
                </g>
              ))}
            </g>
          );
        }
        if (element._pathD) {
          return (
            <g key={element.id} {...baseProps} onPointerDown={(e) => handleElementPointerDown(e, element.id, layer.id)}>
              <path d={element._pathD} fill="transparent" stroke="transparent" strokeWidth={hitStrokeWidth} />
              <path
                d={element._pathD}
                fill={isEngraveLayer || element.mode === 'ENGRAVE_FILLED' ? '#000' : 'none'}
                stroke={element.mode === 'CUT_OUTLINE' ? strokeColor : 'none'}
                strokeWidth={0.3}
              />
            </g>
          );
        }
        return (
          <g key={element.id} {...baseProps} onPointerDown={(e) => handleElementPointerDown(e, element.id, layer.id)}>
            <text
              x={0}
              y={0}
              fontFamily={getCssFontFamily(element.fontId)}
              fontSize={element.sizeMm}
              textAnchor={element.align === 'center' ? 'middle' : element.align === 'right' ? 'end' : 'start'}
              fill={isEngraveLayer ? '#000' : strokeColor}
              dominantBaseline="middle"
            >
              {element.text}
            </text>
          </g>
        );
      }
      case 'shape': {
        return (
          <g key={element.id} {...baseProps} onPointerDown={(e) => handleElementPointerDown(e, element.id, layer.id)}>
            <path d={element.svgPathD} fill="transparent" stroke="transparent" strokeWidth={hitStrokeWidth} />
            <path
              d={element.svgPathD}
              fill={layer.type === 'ENGRAVE' ? '#000' : 'none'}
              stroke={layer.type === 'ENGRAVE' ? 'none' : strokeColor}
              strokeWidth={0.3}
            />
          </g>
        );
      }
      case 'engraveSketch': {
        return (
          <g key={element.id} {...baseProps} onPointerDown={(e) => handleElementPointerDown(e, element.id, layer.id)}>
            {element.svgPathD.map((pathD, i) => (
              <g key={i}>
                <path d={pathD} fill="transparent" stroke="transparent" strokeWidth={hitStrokeWidth} />
                <path d={pathD} fill="none" stroke="#000" strokeWidth={element.strokeMm} />
              </g>
            ))}
          </g>
        );
      }
      case 'engraveImage': {
        return (
          <g key={element.id} {...baseProps} onPointerDown={(e) => handleElementPointerDown(e, element.id, layer.id)}>
            <image
              href={element.pngDataUrl}
              x={-element.widthMm / 2}
              y={-element.heightMm / 2}
              width={element.widthMm}
              height={element.heightMm}
              preserveAspectRatio="xMidYMid meet"
            />
          </g>
        );
      }
      case 'ornament': {
        const ornamentAsset = getOrnamentById(element.assetId);
        if (!ornamentAsset) return null;

        const ornamentStrokeColor = element.style.targetLayer === 'GUIDE' ? '#00ff00' : '#000';
        const strokeWidth = (element.style.strokeMm ?? 0.5) / Math.abs(transform.scaleX || 1);

        return (
          <g key={element.id} {...baseProps} onPointerDown={(e) => handleElementPointerDown(e, element.id, layer.id)}>
            <OrnamentPaths
              pathDs={ornamentAsset.pathDs}
              strokeColor={ornamentStrokeColor}
              strokeWidth={strokeWidth}
              hitStrokeWidth={hitStrokeWidth}
            />
          </g>
        );
      }
      case 'tracedPath': {
        return (
          <g key={element.id} {...baseProps} onPointerDown={(e) => handleElementPointerDown(e, element.id, layer.id)}>
            <path d={element.svgPathD} fill="transparent" stroke="transparent" strokeWidth={hitStrokeWidth} />
            <path
              d={element.svgPathD}
              fill="none"
              stroke={strokeColor}
              strokeWidth={element.strokeMm}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      }
      case 'tracedPathGroup': {
        return (
          <g key={element.id} {...baseProps} onPointerDown={(e) => handleElementPointerDown(e, element.id, layer.id)}>
            {element.svgPathDs.map((pathD, i) => (
              <g key={i}>
                <path d={pathD} fill="transparent" stroke="transparent" strokeWidth={hitStrokeWidth} />
                <path
                  d={pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={element.strokeMm}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            ))}
          </g>
        );
      }
      default:
        return null;
    }
  };

  // Render layers
  const renderLayers = () => {
    const sortedLayers = [...doc.layers].sort((a, b) => a.order - b.order);
    
    return sortedLayers.map(layer => {
      if (!layer.visible) return null;
      
      return (
        <g
          key={layer.id}
          data-layer-id={layer.id}
          data-layer-type={layer.type}
          opacity={layer.opacity}
        >
          {layer.elements.map(element => renderElement(element, layer))}
        </g>
      );
    });
  };

  // SVG viewBox in mm coordinates
  const viewBox = `0 0 ${wMm} ${hMm}`;

  // Calculate SVG style based on view transform
  const svgStyle: React.CSSProperties = {
    width: wMm * DEFAULT_PX_PER_MM * viewTransform.zoom,
    height: hMm * DEFAULT_PX_PER_MM * viewTransform.zoom,
    transform: `translate(${viewTransform.panX}px, ${viewTransform.panY}px)`,
    transformOrigin: '0 0',
  };

  const cursorStyle = isSpacePressed || activeTool === 'pan' 
    ? (dragState.type === 'pan' ? 'grabbing' : 'grab')
    : 'default';

  const marqueeRectPx = useMemo(() => {
    if (!marquee || !marquee.active) return null;
    const x1 = Math.min(marquee.start.xMm, marquee.end.xMm);
    const y1 = Math.min(marquee.start.yMm, marquee.end.yMm);
    const x2 = Math.max(marquee.start.xMm, marquee.end.xMm);
    const y2 = Math.max(marquee.start.yMm, marquee.end.yMm);

    const left = x1 * DEFAULT_PX_PER_MM * viewTransform.zoom + viewTransform.panX;
    const top = y1 * DEFAULT_PX_PER_MM * viewTransform.zoom + viewTransform.panY;
    const width = (x2 - x1) * DEFAULT_PX_PER_MM * viewTransform.zoom;
    const height = (y2 - y1) * DEFAULT_PX_PER_MM * viewTransform.zoom;

    return { left, top, width, height };
  }, [marquee, viewTransform]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-slate-100 ${className}`}
      style={{ cursor: cursorStyle }}
      onWheel={handleWheel}
      onDragOver={(e) => {
        if (!onOrnamentDrop) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(e) => {
        if (!onOrnamentDrop) return;
        e.preventDefault();
        const raw = e.dataTransfer.getData('application/x-psg-ornament') || e.dataTransfer.getData('text/plain');
        if (!raw) return;
        try {
          const data = JSON.parse(raw) as { assetId: string; targetLayer: 'CUT' | 'ENGRAVE' | 'GUIDE'; widthPct: number };
          if (!data?.assetId) return;
          const world = clientToWorld(e.clientX, e.clientY);
          onOrnamentDrop({ ...data, xMm: world.xMm, yMm: world.yMm });
        } catch {
          return;
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={(e) => {
        handlePointerMove(e);
        handleHandleMove(e);
      }}
      onPointerUp={handlePointerUp}
    >
      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        viewBox={viewBox}
        style={svgStyle}
        className="absolute top-0 left-0"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background */}
        <rect
          x={0}
          y={0}
          width={wMm}
          height={hMm}
          fill="white"
          stroke="#cbd5e1"
          strokeWidth={0.5}
        />

        {/* Grid */}
        {renderGrid()}

        {/* Safe zones */}
        {renderSafeZones()}

        {/* Guides */}
        {renderGuides()}

        {/* Base shape outline */}
        <path
          d={doc.artboard.baseShape.pathD}
          fill="none"
          stroke="#ff0000"
          strokeWidth={0.3}
        />

        {/* Holes */}
        {renderHoles()}

        {/* Layers and elements */}
        {renderLayers()}

        {renderOffsetPreview()}
      </svg>

      {/* Selection overlay and transform handles - wrapped for direct DOM manipulation during drag */}
      <div data-selection-overlay="true" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {selectionBoundsWithPreview && selectedIds.length > 0 && (
          <SelectionOverlay
            bounds={selectionBoundsWithPreview}
            viewTransform={viewTransform}
          />
        )}

        {/* Transform handles */}
        {selectionBoundsWithPreview && selectedIds.length > 0 && activeTool === 'select' && (
          <TransformHandles
            bounds={selectionBoundsWithPreview}
            viewTransform={viewTransform}
            onHandleStart={handleHandleStart}
          />
        )}
      </div>

      {marqueeRectPx && (
        <div
          className="absolute border border-blue-600 bg-blue-400/20"
          style={{
            left: marqueeRectPx.left,
            top: marqueeRectPx.top,
            width: marqueeRectPx.width,
            height: marqueeRectPx.height,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Zoom indicator */}
      <div className="absolute bottom-2 right-2 bg-white/80 px-2 py-1 rounded text-xs text-slate-600">
        {Math.round(viewTransform.zoom * 100)}%
      </div>
    </div>
  );
});

// Export utility functions for toolbar
export { fitToContainer };
