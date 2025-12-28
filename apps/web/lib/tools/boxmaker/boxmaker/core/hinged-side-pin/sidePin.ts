/**
 * Side Pin Hole Generator
 *
 * Generates pin holes for LEFT and RIGHT panels
 *
 * RULE: Exactly 1 hole on LEFT, 1 hole on RIGHT
 * RULE: NO holes on any other panels
 */

import type { Pt, Circle, HingedSidePinInputs, PanelRole } from './types';
import { pt } from './edgeFinger';

export interface PinHoleResult {
  hole: Circle;
  warning?: string;
}

/**
 * Generate pin hole for LEFT or RIGHT panel
 *
 * Positioning (deterministic):
 * - cy = pinInsetFromTopMm (from top edge)
 * - LEFT:  cx = D - pinInsetFromBackMm
 * - RIGHT: cx = pinInsetFromBackMm
 *
 * @param panelWidth - Panel width (D for LEFT/RIGHT)
 * @param panelHeight - Panel height (H for LEFT/RIGHT)
 * @param input - Box parameters
 * @returns Pin hole position and optional warning
 */
export function generateSidePinHole(
  panelRole: PanelRole,
  panelWidth: number,
  panelHeight: number,
  input: HingedSidePinInputs
): PinHoleResult {
  const { pinDiameterMm, pinInsetFromTopMm, pinInsetFromBackMm, clearanceMm } = input;

  const holeDiameter = pinDiameterMm + 2 * clearanceMm;
  const r = holeDiameter / 2;

  let cy = pinInsetFromTopMm;
  let cx = panelRole === 'left' ? panelWidth - pinInsetFromBackMm : pinInsetFromBackMm;

  const minDistanceFromEdge = r + 1; // 1mm minimum from edge
  const warnings: string[] = [];
  const label = panelRole.toUpperCase();

  if (cx < minDistanceFromEdge) {
    warnings.push(
      `${label} pin hole clamped on X: ${cx.toFixed(1)} -> ${minDistanceFromEdge.toFixed(1)}`
    );
    cx = minDistanceFromEdge;
  }

  if (cx > panelWidth - minDistanceFromEdge) {
    warnings.push(
      `${label} pin hole clamped on X: ${cx.toFixed(1)} -> ${(panelWidth - minDistanceFromEdge).toFixed(1)}`
    );
    cx = panelWidth - minDistanceFromEdge;
  }

  if (cy < minDistanceFromEdge) {
    warnings.push(
      `${label} pin hole clamped on Y: ${cy.toFixed(1)} -> ${minDistanceFromEdge.toFixed(1)}`
    );
    cy = minDistanceFromEdge;
  }

  if (cy > panelHeight - minDistanceFromEdge) {
    warnings.push(
      `${label} pin hole clamped on Y: ${cy.toFixed(1)} -> ${(panelHeight - minDistanceFromEdge).toFixed(1)}`
    );
    cy = panelHeight - minDistanceFromEdge;
  }

  return {
    hole: { cx, cy, r },
    warning: warnings.length > 0 ? warnings.join(' | ') : undefined,
  };
}

/**
 * Generate finger pull cutout for LID panel
 *
 * Creates a U-shaped cutout on the bottom edge of the lid
 *
 * @param lidWidth - Lid width
 * @param lidHeight - Lid height
 * @param input - Box parameters
 * @returns Array of points forming the U-shaped cutout (relative to lid center)
 */
export function generateLidFingerPull(
  lidWidth: number,
  lidHeight: number,
  input: HingedSidePinInputs
): Pt[] {
  const { fingerPullRadiusMm, fingerPullDepthMm } = input;

  if (fingerPullRadiusMm <= 0 || fingerPullDepthMm <= 0) {
    return [];
  }

  const centerX = lidWidth / 2;
  const bottomY = lidHeight;

  const maxRadius = Math.max(0, Math.min(fingerPullRadiusMm, fingerPullDepthMm, lidWidth / 2));
  const depth = Math.max(0, Math.min(fingerPullDepthMm, lidHeight));
  const radius = maxRadius;

  if (radius <= 0 || depth <= 0) {
    return [];
  }

  const points: Pt[] = [];
  const segments = 24;

  const leftX = centerX - radius;
  const rightX = centerX + radius;
  const topY = bottomY - depth;

  points.push(pt(rightX, bottomY));
  points.push(pt(rightX, topY));

  for (let i = 0; i <= segments; i++) {
    const angle = Math.PI * (i / segments); // right to left
    const x = centerX + radius * Math.cos(angle);
    const y = topY + radius * Math.sin(angle);
    points.push(pt(x, y));
  }

  points.push(pt(leftX, topY));
  points.push(pt(leftX, bottomY));

  return points;
}

/**
 * Validate that panel role is correct for pin holes
 */
export function isPinHolePanel(role: string): boolean {
  return role === 'left' || role === 'right';
}
