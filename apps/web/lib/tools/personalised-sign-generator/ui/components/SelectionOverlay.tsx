'use client';

/**
 * SelectionOverlay - Renders selection rectangle in screen space
 */

import React from 'react';
import type { BoundsMm } from '../../core/canvas/coords';
import type { ViewTransform } from '../../core/canvas/coords';
import { worldToScreen, DEFAULT_PX_PER_MM } from '../../core/canvas/coords';

interface SelectionOverlayProps {
  bounds: BoundsMm;
  viewTransform: ViewTransform;
}

export function SelectionOverlay({ bounds, viewTransform }: SelectionOverlayProps) {
  // Convert bounds corners to screen coordinates
  const topLeft = worldToScreen(bounds.xMm, bounds.yMm, viewTransform);
  const bottomRight = worldToScreen(
    bounds.xMm + bounds.widthMm,
    bounds.yMm + bounds.heightMm,
    viewTransform
  );

  const width = bottomRight.x - topLeft.x;
  const height = bottomRight.y - topLeft.y;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: topLeft.x,
        top: topLeft.y,
        width: width,
        height: height,
        border: '1px solid #3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
      }}
    />
  );
}
