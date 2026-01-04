'use client';

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import type {
  CanvasDocument,
  CanvasElement,
  ElementTransform,
  ViewTransform,
  SelectionState,
  BoundingBox,
} from '../../types/canvas';
import { PX_PER_MM, LAYER_COLORS } from '../../types/canvas';
import {
  screenToWorld,
  worldToScreen,
  mmToPixels,
  zoomAtPoint,
  fitToContainer,
  getElementBounds,
  hitTestElements,
  getElementsInRect,
  getSelectionBounds,
} from '../../core/canvas/coords';

interface CanvasStageProps {
  doc: CanvasDocument;
  selection: SelectionState;
  view: ViewTransform;
  onViewChange: (view: ViewTransform) => void;
  onSelect: (ids: string[], additive?: boolean) => void;
  onClearSelection: () => void;
  onUpdateTransform: (id: string, deltaX: number, deltaY: number) => void;
  onUpdateTransforms?: (updates: Array<{ id: string; transform: Partial<ElementTransform> }>) => void;
  onCommit: () => void;
  showLayerColors?: boolean;
  showGuide?: boolean;
}

interface DragState {
  type: 'none' | 'pan' | 'select' | 'marquee' | 'move' | 'resize';
  startX: number;
  startY: number;
  startWorldX: number;
  startWorldY: number;
  currentX: number;
  currentY: number;
  resize?: {
    centerX: number;
    centerY: number;
    startDist: number;
    initial: Record<string, { xMm: number; yMm: number; scaleX: number; scaleY: number }>;
  };
}

const MARQUEE_THRESHOLD = 5;
const RESIZE_HANDLE_SIZE = 10;

export function CanvasStage({
  doc,
  selection,
  view,
  onViewChange,
  onSelect,
  onClearSelection,
  onUpdateTransform,
  onUpdateTransforms,
  onCommit,
  showLayerColors = false,
  showGuide = false,
}: CanvasStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [drag, setDrag] = useState<DragState>({
    type: 'none',
    startX: 0,
    startY: 0,
    startWorldX: 0,
    startWorldY: 0,
    currentX: 0,
    currentY: 0,
  });

  // Track container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Fit view on mount
  useEffect(() => {
    if (containerSize.width > 0 && containerSize.height > 0) {
      const newView = fitToContainer(
        doc.artboard.widthMm,
        doc.artboard.heightMm,
        containerSize.width,
        containerSize.height
      );
      onViewChange(newView);
    }
  }, [doc.artboard.widthMm, doc.artboard.heightMm]);

  // Selection bounds
  const selectionBounds = useMemo(() => {
    return getSelectionBounds(selection.selectedIds, doc.elements);
  }, [selection.selectedIds, doc.elements]);

  // Get client coordinates from mouse event
  const getClientCoords = useCallback((e: React.MouseEvent | MouseEvent) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const { x, y } = getClientCoords(e);
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newView = zoomAtPoint(view, x, y, view.zoom * delta);
    onViewChange(newView);
  }, [view, onViewChange, getClientCoords]);

  // Handle pointer down
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const { x, y } = getClientCoords(e);
    const world = screenToWorld(x, y, view);

    // Middle button or space+click = pan
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setDrag({
        type: 'pan',
        startX: x,
        startY: y,
        startWorldX: world.xMm,
        startWorldY: world.yMm,
        currentX: x,
        currentY: y,
      });
      return;
    }

    // Left click
    if (e.button === 0) {
      if (selectionBounds && selectionHandles && selection.selectedIds.length > 0) {
        const handleX = selectionHandles.x + selectionHandles.width - RESIZE_HANDLE_SIZE / 2;
        const handleY = selectionHandles.y + selectionHandles.height - RESIZE_HANDLE_SIZE / 2;
        const inHandle =
          x >= handleX - RESIZE_HANDLE_SIZE / 2 &&
          x <= handleX + RESIZE_HANDLE_SIZE / 2 &&
          y >= handleY - RESIZE_HANDLE_SIZE / 2 &&
          y <= handleY + RESIZE_HANDLE_SIZE / 2;

        if (inHandle && onUpdateTransforms) {
          const centerX = selectionBounds.xMm + selectionBounds.widthMm / 2;
          const centerY = selectionBounds.yMm + selectionBounds.heightMm / 2;
          const startDist = Math.max(0.001, Math.hypot(world.xMm - centerX, world.yMm - centerY));
          const initial: Record<string, { xMm: number; yMm: number; scaleX: number; scaleY: number }> = {};
          for (const id of selection.selectedIds) {
            const el = doc.elements.find((e) => e.id === id);
            if (!el) continue;
            initial[id] = {
              xMm: el.transform.xMm,
              yMm: el.transform.yMm,
              scaleX: el.transform.scaleX,
              scaleY: el.transform.scaleY,
            };
          }

          setDrag({
            type: 'resize',
            startX: x,
            startY: y,
            startWorldX: world.xMm,
            startWorldY: world.yMm,
            currentX: x,
            currentY: y,
            resize: { centerX, centerY, startDist, initial },
          });
          return;
        }
      }

      // Check if clicking on an element
      const hitElement = hitTestElements(world.xMm, world.yMm, doc.elements);

      if (hitElement) {
        const isSelected = selection.selectedIds.includes(hitElement.id);
        const isAdditive = e.shiftKey || e.ctrlKey || e.metaKey;

        if (!isSelected) {
          onSelect([hitElement.id], isAdditive);
        }

        // Start move drag
        setDrag({
          type: 'move',
          startX: x,
          startY: y,
          startWorldX: world.xMm,
          startWorldY: world.yMm,
          currentX: x,
          currentY: y,
        });
      } else {
        // Start marquee selection
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
          onClearSelection();
        }
        setDrag({
          type: 'marquee',
          startX: x,
          startY: y,
          startWorldX: world.xMm,
          startWorldY: world.yMm,
          currentX: x,
          currentY: y,
        });
      }
    }
  }, [view, doc.elements, selection.selectedIds, onSelect, onClearSelection, getClientCoords]);

  // Handle pointer move
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (drag.type === 'none') return;

    const { x, y } = getClientCoords(e);
    const world = screenToWorld(x, y, view);

    if (drag.type === 'pan') {
      const dx = x - drag.startX;
      const dy = y - drag.startY;
      onViewChange({
        ...view,
        panX: view.panX + dx - (drag.currentX - drag.startX),
        panY: view.panY + dy - (drag.currentY - drag.startY),
      });
      setDrag(prev => ({ ...prev, currentX: x, currentY: y }));
    }

    if (drag.type === 'marquee') {
      setDrag(prev => ({ ...prev, currentX: x, currentY: y }));
    }

    if (drag.type === 'move') {
      const deltaX = world.xMm - drag.startWorldX;
      const deltaY = world.yMm - drag.startWorldY;

      // Update all selected elements
      for (const id of selection.selectedIds) {
        onUpdateTransform(id, deltaX, deltaY);
      }

      setDrag(prev => ({
        ...prev,
        startWorldX: world.xMm,
        startWorldY: world.yMm,
        currentX: x,
        currentY: y,
      }));
    }

    if (drag.type === 'resize' && drag.resize && onUpdateTransforms) {
      const { centerX, centerY, startDist, initial } = drag.resize;
      const currentDist = Math.max(0.001, Math.hypot(world.xMm - centerX, world.yMm - centerY));
      const scale = Math.max(0.1, Math.min(10, currentDist / startDist));

      const updates: Array<{ id: string; transform: Partial<ElementTransform> }> = [];
      for (const id of selection.selectedIds) {
        const init = initial[id];
        if (!init) continue;
        updates.push({
          id,
          transform: {
            xMm: centerX + (init.xMm - centerX) * scale,
            yMm: centerY + (init.yMm - centerY) * scale,
            scaleX: init.scaleX * scale,
            scaleY: init.scaleY * scale,
          },
        });
      }

      if (updates.length > 0) {
        onUpdateTransforms(updates);
      }

      setDrag(prev => ({ ...prev, currentX: x, currentY: y }));
    }
  }, [drag, view, selection.selectedIds, onViewChange, onUpdateTransform, onUpdateTransforms, getClientCoords]);

  // Handle pointer up
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (drag.type === 'marquee') {
      const startWorld = screenToWorld(drag.startX, drag.startY, view);
      const endWorld = screenToWorld(drag.currentX, drag.currentY, view);

      const distance = Math.hypot(drag.currentX - drag.startX, drag.currentY - drag.startY);

      if (distance > MARQUEE_THRESHOLD) {
        const rect: BoundingBox = {
          xMm: Math.min(startWorld.xMm, endWorld.xMm),
          yMm: Math.min(startWorld.yMm, endWorld.yMm),
          widthMm: Math.abs(endWorld.xMm - startWorld.xMm),
          heightMm: Math.abs(endWorld.yMm - startWorld.yMm),
        };

        const elementsInRect = getElementsInRect(rect, doc.elements);
        const ids = elementsInRect.map(el => el.id);

        if (ids.length > 0) {
          const isAdditive = e.shiftKey || e.ctrlKey || e.metaKey;
          onSelect(ids, isAdditive);
        }
      }
    }

    if (drag.type === 'move') {
      onCommit();
    }

    if (drag.type === 'resize') {
      onCommit();
    }

    setDrag({
      type: 'none',
      startX: 0,
      startY: 0,
      startWorldX: 0,
      startWorldY: 0,
      currentX: 0,
      currentY: 0,
    });
  }, [drag, view, doc.elements, onSelect, onCommit]);

  // Render element
  const renderElement = useCallback((element: CanvasElement) => {
    const { transform, layer } = element;
    const color = showLayerColors ? LAYER_COLORS[layer] : '#000000';

    if (layer === 'GUIDE' && !showGuide) return null;

    const transformStr = `translate(${transform.xMm}, ${transform.yMm}) rotate(${transform.rotateDeg}) scale(${transform.scaleX}, ${transform.scaleY})`;

    switch (element.kind) {
      case 'shape':
      case 'border':
      case 'ornament':
      case 'traced':
      case 'basicShape':
      case 'icon':
        return (
          <g key={element.id} transform={transformStr}>
            <path
              d={element.pathD}
              fill="none"
              stroke={color}
              strokeWidth={element.strokeWidthMm}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );

      case 'logo': {
        const fill = element.op === 'ENGRAVE' ? color : 'none';
        const stroke = element.op === 'ENGRAVE' ? 'none' : color;
        const strokeWidth = element.strokeWidthMm;
        return (
          <g key={element.id} transform={transformStr}>
            <path
              d={element.pathD}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      }

      case 'text':
        return (
          <g key={element.id} transform={transformStr}>
            <text
              x={0}
              y={0}
              textAnchor={element.textAnchor}
              dominantBaseline="middle"
              fontFamily={element.fontFamily}
              fontSize={element.fontSizeMm}
              fontWeight={element.fontWeight}
              fill="none"
              stroke={color}
              strokeWidth={0.3}
              letterSpacing={element.letterSpacing}
            >
              {element.content}
            </text>
          </g>
        );

      default:
        return null;
    }
  }, [showLayerColors, showGuide]);

  // Marquee rectangle in screen coords
  const marqueeRect = useMemo(() => {
    if (drag.type !== 'marquee') return null;
    const distance = Math.hypot(drag.currentX - drag.startX, drag.currentY - drag.startY);
    if (distance < MARQUEE_THRESHOLD) return null;

    return {
      x: Math.min(drag.startX, drag.currentX),
      y: Math.min(drag.startY, drag.currentY),
      width: Math.abs(drag.currentX - drag.startX),
      height: Math.abs(drag.currentY - drag.startY),
    };
  }, [drag]);

  // Selection handles in screen coords
  const selectionHandles = useMemo(() => {
    if (!selectionBounds) return null;

    const topLeft = worldToScreen(selectionBounds.xMm, selectionBounds.yMm, view);
    const bottomRight = worldToScreen(
      selectionBounds.xMm + selectionBounds.widthMm,
      selectionBounds.yMm + selectionBounds.heightMm,
      view
    );

    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }, [selectionBounds, view]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-white cursor-crosshair"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{ touchAction: 'none' }}
    >
      {/* SVG Canvas */}
      <svg
        className="absolute inset-0"
        width={containerSize.width}
        height={containerSize.height}
        style={{ pointerEvents: 'none' }}
      >
        {/* Transform group for world coordinates */}
        <g transform={`translate(${view.panX}, ${view.panY}) scale(${view.zoom * PX_PER_MM})`}>
          {/* Artboard background */}
          <rect
            x={0}
            y={0}
            width={doc.artboard.widthMm}
            height={doc.artboard.heightMm}
            fill="#ffffff"
            stroke="#e2e8f0"
            strokeWidth={0.5 / (view.zoom * PX_PER_MM)}
          />

          {/* Artboard base shape - centered at artboard center */}
          {doc.artboard.basePathD && (
            <g transform={`translate(${doc.artboard.widthMm / 2}, ${doc.artboard.heightMm / 2})`}>
              <path
                d={doc.artboard.basePathD}
                fill="none"
                stroke="#cbd5e1"
                strokeWidth={0.3}
                strokeDasharray="2,2"
              />
            </g>
          )}

          {/* Elements */}
          {doc.elements.map(renderElement)}
        </g>

        {/* Selection handles (screen coords) */}
        {selectionHandles && (
          <>
            <rect
              x={selectionHandles.x}
              y={selectionHandles.y}
              width={selectionHandles.width}
              height={selectionHandles.height}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={1}
              strokeDasharray="4,4"
            />
            <rect
              x={selectionHandles.x + selectionHandles.width - RESIZE_HANDLE_SIZE / 2}
              y={selectionHandles.y + selectionHandles.height - RESIZE_HANDLE_SIZE / 2}
              width={RESIZE_HANDLE_SIZE}
              height={RESIZE_HANDLE_SIZE}
              fill="#3b82f6"
              stroke="#1d4ed8"
              strokeWidth={1}
            />
          </>
        )}

        {/* Marquee rectangle (screen coords) */}
        {marqueeRect && (
          <rect
            x={marqueeRect.x}
            y={marqueeRect.y}
            width={marqueeRect.width}
            height={marqueeRect.height}
            fill="rgba(59, 130, 246, 0.1)"
            stroke="#3b82f6"
            strokeWidth={1}
          />
        )}
      </svg>

      {/* Info overlay */}
      <div className="absolute bottom-2 left-2 text-[10px] text-slate-500 bg-white/80 px-2 py-1 rounded">
        {doc.artboard.widthMm}×{doc.artboard.heightMm}mm | {Math.round(view.zoom * 100)}%
      </div>
    </div>
  );
}
