/**
 * Hinged Lid (Side Pin) Box - Panel Generator
 *
 * Generates all 6 panels with finger joints and side pin hinge
 *
 * RULES:
 * - Only LEFT and RIGHT have pin holes (1 hole each)
 * - LID has optional finger pull (U-shaped cutout)
 * - NO holes on BACK/FRONT/BOTTOM/LID (except finger pull cutout)
 * - OUTPUT: Only M/L/Z in paths, <circle> for holes
 */

import type {
  Pt,
  Circle,
  Panel,
  HingedSidePinPanels,
  HingedSidePinInputs,
  PanelRole,
  PanelSpec,
  EdgeMode,
} from './types';
import { PIN_HOLE_PANELS } from './types';
import { buildPanel, type PanelSpec as GeometryPanelSpec, type EdgeMode as GeometryEdgeMode } from '../geometry-core/edgeGenerator';
import { generateSidePinHole, generateLidFingerPull } from './sidePin';

type EdgeName = keyof PanelSpec['edges'];

function toEdgeMode(edge: EdgeName, mode: EdgeMode): GeometryEdgeMode {
  // MANDATORY: apply edge mode EXACTLY as declared in PanelSpec.
  // No inference, no swapping, no orientation tricks.
  void edge;
  if (mode === 'flat') return 'flat';
  return mode === 'in' ? 'fingers-in' : 'fingers-out';
}

function validatePanelSpecs(specs: Record<PanelRole, PanelSpec>): void {
  const sidePanels: PanelRole[] = ['front', 'back', 'left', 'right'];
  for (const role of sidePanels) {
    if (specs[role].edges.top !== 'flat') {
      throw new Error(`Side panel TOP edge must be flat: ${role}.top=${specs[role].edges.top}`);
    }
  }

  const bottomEdges = specs.bottom.edges;
  const bottomHasFlat =
    bottomEdges.top === 'flat' ||
    bottomEdges.right === 'flat' ||
    bottomEdges.bottom === 'flat' ||
    bottomEdges.left === 'flat';
  if (bottomHasFlat) {
    throw new Error(
      `BOTTOM must have finger joints on all edges (no flat). Got: top=${bottomEdges.top}, right=${bottomEdges.right}, bottom=${bottomEdges.bottom}, left=${bottomEdges.left}`
    );
  }

  const lidEdges = specs.lid.edges;
  const lidAllFlat =
    lidEdges.top === 'flat' &&
    lidEdges.right === 'flat' &&
    lidEdges.bottom === 'flat' &&
    lidEdges.left === 'flat';
  if (!lidAllFlat) {
    throw new Error(
      `LID must be flat on all edges. Got: top=${lidEdges.top}, right=${lidEdges.right}, bottom=${lidEdges.bottom}, left=${lidEdges.left}`
    );
  }
}

function toPanelBuildSpec(spec: PanelSpec, input: HingedSidePinInputs): GeometryPanelSpec {
  return {
    width: spec.width,
    height: spec.height,
    thickness: input.thicknessMm,
    fingerWidth: input.fingerWidthMm,
    topMode: toEdgeMode('top', spec.edges.top),
    rightMode: toEdgeMode('right', spec.edges.right),
    bottomMode: toEdgeMode('bottom', spec.edges.bottom),
    leftMode: toEdgeMode('left', spec.edges.left),
  };
}

function getPanelSpecs(input: HingedSidePinInputs): Record<PanelRole, PanelSpec> {
  const { innerWidthMm: W, innerDepthMm: D, innerHeightMm: H, thicknessMm: T } = input;

  // Explicit mapping (no inference) - EXACT specification
  return {
    front: {
      role: 'front',
      width: W + 2 * T,
      height: H,
      edges: { top: 'flat', right: 'in', bottom: 'in', left: 'out' },
    },
    back: {
      role: 'back',
      width: W + 2 * T,
      height: H,
      edges: { top: 'flat', right: 'out', bottom: 'in', left: 'in' },
    },
    left: {
      role: 'left',
      width: D,
      height: H,
      edges: { top: 'flat', right: 'out', bottom: 'in', left: 'in' },
    },
    right: {
      role: 'right',
      width: D,
      height: H,
      edges: { top: 'flat', right: 'in', bottom: 'in', left: 'out' },
    },
    bottom: {
      role: 'bottom',
      width: W + 2 * T,
      height: D + 2 * T,
      edges: { top: 'out', right: 'out', bottom: 'out', left: 'out' },
    },
    lid: {
      role: 'lid',
      width: W + 2 * T,
      height: D + 2 * T,
      edges: { top: 'flat', right: 'flat', bottom: 'flat', left: 'flat' },
    },
  };
}

function isComplementary(a: EdgeMode, b: EdgeMode): boolean {
  return (a === 'in' && b === 'out') || (a === 'out' && b === 'in');
}

function assertComplementary(
  specs: Record<PanelRole, PanelSpec>,
  aPanel: PanelRole,
  aEdge: EdgeName,
  bPanel: PanelRole,
  bEdge: EdgeName
): void {
  const a = specs[aPanel].edges[aEdge];
  const b = specs[bPanel].edges[bEdge];

  if (!isComplementary(a, b)) {
    throw new Error(
      `Panel edge mapping invalid: ${aPanel}.${aEdge}=${a} must complement ${bPanel}.${bEdge}=${b}`
    );
  }
}

function validatePanelEdgeMapping(specs: Record<PanelRole, PanelSpec>): void {
  // Vertical seams
  assertComplementary(specs, 'front', 'left', 'left', 'left');
  assertComplementary(specs, 'front', 'right', 'right', 'left');
  assertComplementary(specs, 'back', 'left', 'left', 'right');
  assertComplementary(specs, 'back', 'right', 'right', 'right');

  // Bottom mates
  assertComplementary(specs, 'front', 'bottom', 'bottom', 'top');
  assertComplementary(specs, 'right', 'bottom', 'bottom', 'right');
  assertComplementary(specs, 'back', 'bottom', 'bottom', 'bottom');
  assertComplementary(specs, 'left', 'bottom', 'bottom', 'left');
}

function appendPoints(target: Pt[], points: Pt[]): void {
  for (const p of points) {
    const last = target[target.length - 1];
    const samePoint =
      last && Math.abs(last.x - p.x) < 0.001 && Math.abs(last.y - p.y) < 0.001;
    if (!samePoint) {
      target.push(p);
    }
  }
}

function buildLidOutline(spec: PanelSpec, input: HingedSidePinInputs): Pt[] {
  if (!input.lidFingerPull) {
    return buildPanel(toPanelBuildSpec(spec, input));
  }

  const fingerPull = generateLidFingerPull(spec.width, spec.height, input);
  if (fingerPull.length === 0) {
    return buildPanel(toPanelBuildSpec(spec, input));
  }

  const bottomY = spec.height;
  const points: Pt[] = [];

  appendPoints(points, [
    { x: 0, y: 0 },
    { x: spec.width, y: 0 },
    { x: spec.width, y: bottomY },
  ]);

  const rightX = fingerPull[0].x;
  if (rightX < spec.width) {
    appendPoints(points, [{ x: rightX, y: bottomY }]);
  }

  appendPoints(points, fingerPull);

  const leftX = fingerPull[fingerPull.length - 1].x;
  if (leftX > 0) {
    appendPoints(points, [{ x: 0, y: bottomY }]);
  }

  appendPoints(points, [{ x: 0, y: 0 }]);

  return points;
}

function buildPanelFromSpec(spec: PanelSpec, input: HingedSidePinInputs): Panel {
  const outline = spec.role === 'lid' ? buildLidOutline(spec, input) : buildPanel(toPanelBuildSpec(spec, input));
  const hasPinHole = spec.role === 'left' || spec.role === 'right';
  let holes: Circle[] = [];
  let warnings: string[] | undefined;

  if (hasPinHole) {
    const pinHole = generateSidePinHole(spec.role, spec.width, spec.height, input);
    holes = [pinHole.hole];
    warnings = pinHole.warning ? [pinHole.warning] : undefined;
  }

  return {
    role: spec.role,
    name: spec.role.toUpperCase(),
    width: spec.width,
    height: spec.height,
    outline,
    holes,
    hasPinHole,
    warnings,
  };
}

/**
 * Generate all panels for the hinged side pin box
 */
export function generateHingedSidePinPanels(input: HingedSidePinInputs): HingedSidePinPanels {
  const panelSpecs = getPanelSpecs(input);
  validatePanelSpecs(panelSpecs);
  validatePanelEdgeMapping(panelSpecs);

  return {
    bottom: buildPanelFromSpec(panelSpecs.bottom, input),
    front: buildPanelFromSpec(panelSpecs.front, input),
    back: buildPanelFromSpec(panelSpecs.back, input),
    left: buildPanelFromSpec(panelSpecs.left, input),
    right: buildPanelFromSpec(panelSpecs.right, input),
    lid: buildPanelFromSpec(panelSpecs.lid, input),
  };
}

/**
 * Validate generated panels
 * Throws error if any validation fails
 */
export function validatePanels(panels: HingedSidePinPanels): void {
  const panelList = [panels.bottom, panels.front, panels.back, panels.left, panels.right, panels.lid];

  // Count total holes
  let totalHoles = 0;
  let leftHoles = 0;
  let rightHoles = 0;

  for (const panel of panelList) {
    const isPinHolePanel = PIN_HOLE_PANELS.includes(panel.role);
    const holeCount = panel.holes.length;

    totalHoles += holeCount;

    if (panel.role === 'left') leftHoles = holeCount;
    if (panel.role === 'right') rightHoles = holeCount;

    // Rule: Non-pin-hole panels must NOT have holes
    if (!isPinHolePanel && holeCount > 0) {
      throw new Error(
        `VALIDATION ERROR: Panel "${panel.name}" (${panel.role}) has ${holeCount} holes. ` +
          `Only LEFT and RIGHT can have pin holes.`
      );
    }

    // Rule: Pin-hole panels MUST have exactly 1 hole
    if (isPinHolePanel && holeCount !== 1) {
      throw new Error(
        `VALIDATION ERROR: Pin-hole panel "${panel.name}" (${panel.role}) has ${holeCount} holes. ` +
          `Must have exactly 1 pin hole.`
      );
    }
  }

  // Rule: Exactly 2 holes total (1 on LEFT, 1 on RIGHT)
  if (totalHoles !== 2) {
    throw new Error(`VALIDATION ERROR: Total holes = ${totalHoles}. Must be exactly 2 (1 LEFT, 1 RIGHT).`);
  }

  if (leftHoles !== 1 || rightHoles !== 1) {
    throw new Error(`VALIDATION ERROR: LEFT=${leftHoles} holes, RIGHT=${rightHoles} holes. Must be 1 each.`);
  }
}
