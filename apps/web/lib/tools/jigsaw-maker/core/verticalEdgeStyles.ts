/**
 * Vertical edge style implementations (organic and simple)
 * Split into separate file to keep sharedEdgeGenerator.ts manageable
 */

import { createSeededRandom } from './utils/rng';
import type { KnobParameters } from './sharedEdgeGenerator';

export interface EdgeGeometry {
  pathSegment: string;
  reversed: string;
  isTab: boolean;
}

/**
 * Organic style: Perfect circular knobs without neck (vertical)
 * Circle partially overlaps with piece edge - uses SVG arc for perfect circles
 */
export function generateVerticalEdgeOrganic(
  x: number,
  startY: number,
  length: number,
  seed: number,
  difficulty: number = 0,
  knobParams: KnobParameters = {}
): EdgeGeometry {
  const rng = createSeededRandom(seed);
  
  const knobSizePct = knobParams.knobSizePct ?? 65;
  const knobJitter = knobParams.knobJitter ?? 0.25;
  const df = difficulty / 100;
  
  const positionOffset = (rng() - 0.5) * 2 * df * 0.2 * length;
  const sizeScale = 0.7 + (knobSizePct - 40) / 50 * 0.6;
  
  // Circle radius
  const baseRadius = length * 0.12 * sizeScale;
  const jitterFactor = 1 + (rng() - 0.5) * knobJitter;
  const radius = baseRadius * (0.85 + rng() * 0.3) * jitterFactor;
  
  const isTab = rng() > 0.5;
  const d = isTab ? -1 : 1;
  
  const endY = startY + length;
  const midY = startY + length / 2 + positionOffset;
  
  // Circle center: 10% of diameter overlaps with edge = 0.2*radius overlap
  const overlap = radius * 0.2;
  const circleCenterX = x + (radius - overlap) * d;
  
  // Calculate intersection points
  // chordHalfWidth = sqrt(r² - (0.8r)²) = sqrt(0.36r²) = 0.6r
  const chordHalfWidth = radius * 0.6;
  
  const topY = midY - chordHalfWidth;
  const bottomY = midY + chordHalfWidth;
  
  const fwd: string[] = [];
  
  fwd.push(`L ${x.toFixed(2)} ${topY.toFixed(2)}`);
  
  // Use SVG arc command for perfect circle
  // A rx ry x-axis-rotation large-arc-flag sweep-flag x y
  const sweepFlag = d === -1 ? 0 : 1;  // tab goes left, slot goes right
  const largeArcFlag = 1;  // We want the larger arc
  
  fwd.push(`A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 ${largeArcFlag} ${sweepFlag} ${x.toFixed(2)} ${bottomY.toFixed(2)}`);
  
  fwd.push(`L ${x.toFixed(2)} ${endY.toFixed(2)}`);
  
  // Reversed path
  const rev: string[] = [];
  rev.push(`L ${x.toFixed(2)} ${bottomY.toFixed(2)}`);
  const revSweepFlag = sweepFlag === 1 ? 0 : 1;
  rev.push(`A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 ${largeArcFlag} ${revSweepFlag} ${x.toFixed(2)} ${topY.toFixed(2)}`);
  rev.push(`L ${x.toFixed(2)} ${startY.toFixed(2)}`);
  
  return { pathSegment: fwd.join(' '), reversed: rev.join(' '), isTab };
}

/**
 * Simple style: Basic geometric knobs (vertical)
 */
export function generateVerticalEdgeSimple(
  x: number,
  startY: number,
  length: number,
  seed: number,
  difficulty: number = 0,
  knobParams: KnobParameters = {}
): EdgeGeometry {
  const rng = createSeededRandom(seed);
  
  const knobSizePct = knobParams.knobSizePct ?? 65;
  const df = difficulty / 100;
  
  const positionOffset = (rng() - 0.5) * 2 * df * 0.2 * length;
  const sizeScale = 0.7 + (knobSizePct - 40) / 50 * 0.6;
  
  const depth = length * 0.18 * sizeScale * (0.9 + rng() * 0.2);
  const knobWidth = length * 0.25 * sizeScale * (0.9 + rng() * 0.2);
  
  const isTab = rng() > 0.5;
  const d = isTab ? -1 : 1;
  
  const endY = startY + length;
  const midY = startY + length / 2 + positionOffset;
  
  const knobStartY = midY - knobWidth / 2;
  const knobEndY = midY + knobWidth / 2;
  const knobX = x + depth * d;
  
  const fwd: string[] = [];
  
  fwd.push(`L ${x.toFixed(2)} ${knobStartY.toFixed(2)}`);
  fwd.push(`L ${knobX.toFixed(2)} ${knobStartY.toFixed(2)}`);
  fwd.push(`L ${knobX.toFixed(2)} ${knobEndY.toFixed(2)}`);
  fwd.push(`L ${x.toFixed(2)} ${knobEndY.toFixed(2)}`);
  fwd.push(`L ${x.toFixed(2)} ${endY.toFixed(2)}`);
  
  const rev: string[] = [];
  rev.push(`L ${x.toFixed(2)} ${knobEndY.toFixed(2)}`);
  rev.push(`L ${knobX.toFixed(2)} ${knobEndY.toFixed(2)}`);
  rev.push(`L ${knobX.toFixed(2)} ${knobStartY.toFixed(2)}`);
  rev.push(`L ${x.toFixed(2)} ${knobStartY.toFixed(2)}`);
  rev.push(`L ${x.toFixed(2)} ${startY.toFixed(2)}`);
  
  return { pathSegment: fwd.join(' '), reversed: rev.join(' '), isTab };
}
