import type { KnobStyle } from '../types/jigsaw';
import { createSeededRandom, randomInRange, randomBool } from './random';

export interface Point {
  x: number;
  y: number;
}

export interface EdgePath {
  path: string;
  knobOutward: boolean;
}

/**
 * Generate a single edge path with optional knob
 * @param start - Start point of edge
 * @param end - End point of edge
 * @param hasKnob - Whether this edge has a knob (false for border edges)
 * @param knobOutward - Direction of knob (true = outward, false = inward/socket)
 * @param style - Knob style (classic, organic, simple)
 * @param random - Seeded random function
 * @param kidsMode - Simplified knobs for kids puzzles
 */
export function generateEdgePath(
  start: Point,
  end: Point,
  hasKnob: boolean,
  knobOutward: boolean,
  style: KnobStyle,
  random: () => number,
  kidsMode: boolean = false
): string {
  if (!hasKnob) {
    // Straight edge for borders
    return `L ${end.x.toFixed(4)} ${end.y.toFixed(4)}`;
  }

  // Calculate edge vector and perpendicular
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  // Unit vectors
  const ux = dx / length;
  const uy = dy / length;
  
  // Perpendicular unit vector (points "outward" when knobOutward is true)
  const px = knobOutward ? -uy : uy;
  const py = knobOutward ? ux : -ux;

  // Knob parameters based on style
  const params = getKnobParams(style, length, random, kidsMode);
  
  // Build the knob path using cubic Bezier curves
  return buildKnobPath(start, end, ux, uy, px, py, length, params);
}

interface KnobParams {
  neckStart: number;    // Position along edge where neck starts (0-1)
  neckEnd: number;      // Position along edge where neck ends (0-1)
  neckWidth: number;    // Width of neck as fraction of length
  knobHeight: number;   // Height of knob perpendicular to edge
  knobWidth: number;    // Width of knob head
  curveTension: number; // How curved the knob sides are
}

function getKnobParams(
  style: KnobStyle,
  edgeLength: number,
  random: () => number,
  kidsMode: boolean
): KnobParams {
  const baseKnobSize = edgeLength * (kidsMode ? 0.25 : 0.2);
  
  switch (style) {
    case 'classic':
      return {
        neckStart: randomInRange(random, 0.35, 0.42),
        neckEnd: randomInRange(random, 0.58, 0.65),
        neckWidth: baseKnobSize * 0.4,
        knobHeight: baseKnobSize * (kidsMode ? 0.8 : 1.0),
        knobWidth: baseKnobSize * 0.9,
        curveTension: 0.4,
      };
      
    case 'organic':
      return {
        neckStart: randomInRange(random, 0.32, 0.45),
        neckEnd: randomInRange(random, 0.55, 0.68),
        neckWidth: baseKnobSize * randomInRange(random, 0.35, 0.5),
        knobHeight: baseKnobSize * randomInRange(random, 0.85, 1.15),
        knobWidth: baseKnobSize * randomInRange(random, 0.8, 1.1),
        curveTension: randomInRange(random, 0.3, 0.5),
      };
      
    case 'simple':
      return {
        neckStart: 0.4,
        neckEnd: 0.6,
        neckWidth: baseKnobSize * 0.5,
        knobHeight: baseKnobSize * 0.7,
        knobWidth: baseKnobSize * 0.7,
        curveTension: 0.2,
      };
      
    default:
      return getKnobParams('classic', edgeLength, random, kidsMode);
  }
}

function buildKnobPath(
  start: Point,
  end: Point,
  ux: number,
  uy: number,
  px: number,
  py: number,
  length: number,
  params: KnobParams
): string {
  const { neckStart, neckEnd, neckWidth, knobHeight, knobWidth, curveTension } = params;
  
  // Key points along the edge
  const p1 = {
    x: start.x + ux * length * neckStart,
    y: start.y + uy * length * neckStart,
  };
  
  const p2 = {
    x: start.x + ux * length * neckEnd,
    y: start.y + uy * length * neckEnd,
  };
  
  // Neck base points (slightly inward)
  const neckBase1 = {
    x: p1.x + px * neckWidth * 0.1,
    y: p1.y + py * neckWidth * 0.1,
  };
  
  const neckBase2 = {
    x: p2.x + px * neckWidth * 0.1,
    y: p2.y + py * neckWidth * 0.1,
  };
  
  // Neck top points
  const neckTop1 = {
    x: p1.x + px * knobHeight * 0.5,
    y: p1.y + py * knobHeight * 0.5,
  };
  
  const neckTop2 = {
    x: p2.x + px * knobHeight * 0.5,
    y: p2.y + py * knobHeight * 0.5,
  };
  
  // Knob head points (wider than neck)
  const headOffset = (knobWidth - neckWidth) / 2;
  const knobHead1 = {
    x: neckTop1.x - ux * headOffset + px * knobHeight * 0.5,
    y: neckTop1.y - uy * headOffset + py * knobHeight * 0.5,
  };
  
  const knobHead2 = {
    x: neckTop2.x + ux * headOffset + px * knobHeight * 0.5,
    y: neckTop2.y + uy * headOffset + py * knobHeight * 0.5,
  };
  
  // Top of knob (center)
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const knobTop = {
    x: midX + px * knobHeight,
    y: midY + py * knobHeight,
  };
  
  // Control points for smooth curves
  const tension = curveTension;
  
  // Build path using cubic Bezier curves
  const fmt = (n: number) => n.toFixed(4);
  
  let path = '';
  
  // Line to neck start
  path += `L ${fmt(p1.x)} ${fmt(p1.y)} `;
  
  // Curve into neck
  path += `C ${fmt(p1.x + px * neckWidth * tension)} ${fmt(p1.y + py * neckWidth * tension)} `;
  path += `${fmt(neckTop1.x - ux * neckWidth * tension)} ${fmt(neckTop1.y - uy * neckWidth * tension)} `;
  path += `${fmt(neckTop1.x)} ${fmt(neckTop1.y)} `;
  
  // Curve to knob head left
  path += `C ${fmt(neckTop1.x + px * knobHeight * tension)} ${fmt(neckTop1.y + py * knobHeight * tension)} `;
  path += `${fmt(knobHead1.x - ux * knobWidth * tension)} ${fmt(knobHead1.y - uy * knobWidth * tension)} `;
  path += `${fmt(knobHead1.x)} ${fmt(knobHead1.y)} `;
  
  // Curve across top of knob
  path += `C ${fmt(knobHead1.x + ux * knobWidth * tension)} ${fmt(knobHead1.y + uy * knobWidth * tension)} `;
  path += `${fmt(knobTop.x - ux * knobWidth * 0.3)} ${fmt(knobTop.y - uy * knobWidth * 0.3)} `;
  path += `${fmt(knobTop.x)} ${fmt(knobTop.y)} `;
  
  path += `C ${fmt(knobTop.x + ux * knobWidth * 0.3)} ${fmt(knobTop.y + uy * knobWidth * 0.3)} `;
  path += `${fmt(knobHead2.x - ux * knobWidth * tension)} ${fmt(knobHead2.y - uy * knobWidth * tension)} `;
  path += `${fmt(knobHead2.x)} ${fmt(knobHead2.y)} `;
  
  // Curve to neck top right
  path += `C ${fmt(knobHead2.x + ux * knobWidth * tension)} ${fmt(knobHead2.y + uy * knobWidth * tension)} `;
  path += `${fmt(neckTop2.x + px * knobHeight * tension)} ${fmt(neckTop2.y + py * knobHeight * tension)} `;
  path += `${fmt(neckTop2.x)} ${fmt(neckTop2.y)} `;
  
  // Curve out of neck
  path += `C ${fmt(neckTop2.x + ux * neckWidth * tension)} ${fmt(neckTop2.y + uy * neckWidth * tension)} `;
  path += `${fmt(p2.x + px * neckWidth * tension)} ${fmt(p2.y + py * neckWidth * tension)} `;
  path += `${fmt(p2.x)} ${fmt(p2.y)} `;
  
  // Line to edge end
  path += `L ${fmt(end.x)} ${fmt(end.y)}`;
  
  return path;
}

/**
 * Generate the mirror (socket) of an edge path
 * For matching edges on adjacent pieces
 */
export function mirrorEdgePath(
  start: Point,
  end: Point,
  hasKnob: boolean,
  originalKnobOutward: boolean,
  style: KnobStyle,
  random: () => number,
  kidsMode: boolean = false
): string {
  // The mirror is the same edge but with knob direction reversed
  return generateEdgePath(start, end, hasKnob, !originalKnobOutward, style, random, kidsMode);
}
