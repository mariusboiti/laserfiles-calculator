'use client';

/**
 * TransformHandles - Resize and rotate handles for selected elements
 */

import React from 'react';
import type { BoundsMm, ViewTransform } from '../../core/canvas/coords';
import { worldToScreen, DEFAULT_PX_PER_MM } from '../../core/canvas/coords';

export type HandleType = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se' | 'rotate';

interface TransformHandlesProps {
  bounds: BoundsMm;
  viewTransform: ViewTransform;
  onHandleStart: (handle: HandleType, e: React.PointerEvent) => void;
}

const HANDLE_SIZE = 8;
const ROTATE_HANDLE_OFFSET = 24;

export function TransformHandles({
  bounds,
  viewTransform,
  onHandleStart,
}: TransformHandlesProps) {
  // Convert bounds to screen coordinates
  const topLeft = worldToScreen(bounds.xMm, bounds.yMm, viewTransform);
  const topRight = worldToScreen(bounds.xMm + bounds.widthMm, bounds.yMm, viewTransform);
  const bottomLeft = worldToScreen(bounds.xMm, bounds.yMm + bounds.heightMm, viewTransform);
  const bottomRight = worldToScreen(
    bounds.xMm + bounds.widthMm,
    bounds.yMm + bounds.heightMm,
    viewTransform
  );

  const center = {
    x: (topLeft.x + bottomRight.x) / 2,
    y: (topLeft.y + bottomRight.y) / 2,
  };

  const width = bottomRight.x - topLeft.x;
  const height = bottomRight.y - topLeft.y;

  // Handle positions
  const handles: Array<{ type: HandleType; x: number; y: number; cursor: string }> = [
    // Corners
    { type: 'nw', x: topLeft.x, y: topLeft.y, cursor: 'nwse-resize' },
    { type: 'ne', x: topRight.x, y: topRight.y, cursor: 'nesw-resize' },
    { type: 'sw', x: bottomLeft.x, y: bottomLeft.y, cursor: 'nesw-resize' },
    { type: 'se', x: bottomRight.x, y: bottomRight.y, cursor: 'nwse-resize' },
    // Edges
    { type: 'n', x: center.x, y: topLeft.y, cursor: 'ns-resize' },
    { type: 's', x: center.x, y: bottomRight.y, cursor: 'ns-resize' },
    { type: 'w', x: topLeft.x, y: center.y, cursor: 'ew-resize' },
    { type: 'e', x: bottomRight.x, y: center.y, cursor: 'ew-resize' },
  ];

  // Rotate handle (above top center)
  const rotateHandle = {
    type: 'rotate' as HandleType,
    x: center.x,
    y: topLeft.y - ROTATE_HANDLE_OFFSET,
    cursor: 'grab',
  };

  const handlePointerDown = (type: HandleType) => (e: React.PointerEvent) => {
    e.stopPropagation();
    onHandleStart(type, e);
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Selection box outline */}
      <svg
        className="absolute inset-0 w-full h-full overflow-visible"
        style={{ pointerEvents: 'none' }}
      >
        {/* Bounding box */}
        <rect
          x={topLeft.x}
          y={topLeft.y}
          width={width}
          height={height}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={1}
          strokeDasharray="4,2"
        />
        
        {/* Line from top center to rotate handle */}
        <line
          x1={center.x}
          y1={topLeft.y}
          x2={rotateHandle.x}
          y2={rotateHandle.y + HANDLE_SIZE / 2}
          stroke="#3b82f6"
          strokeWidth={1}
        />
      </svg>

      {/* Resize handles */}
      {handles.map(({ type, x, y, cursor }) => (
        <div
          key={type}
          className="absolute bg-white border-2 border-blue-500 pointer-events-auto"
          style={{
            left: x - HANDLE_SIZE / 2,
            top: y - HANDLE_SIZE / 2,
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            cursor,
          }}
          onPointerDown={handlePointerDown(type)}
        />
      ))}

      {/* Rotate handle */}
      <div
        className="absolute bg-blue-500 rounded-full pointer-events-auto"
        style={{
          left: rotateHandle.x - HANDLE_SIZE / 2,
          top: rotateHandle.y - HANDLE_SIZE / 2,
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
          cursor: rotateHandle.cursor,
        }}
        onPointerDown={handlePointerDown('rotate')}
      >
        {/* Rotate icon */}
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full p-0.5 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path d="M12 3a9 9 0 1 0 9 9" />
          <polyline points="21 3 21 9 15 9" />
        </svg>
      </div>
    </div>
  );
}
