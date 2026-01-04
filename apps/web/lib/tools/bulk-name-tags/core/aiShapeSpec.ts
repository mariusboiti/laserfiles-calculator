import { shapeElements } from './shapes';

export type ShapeSpec = {
  shape: 'rounded-rect' | 'circle' | 'heart' | 'bone' | 'shield' | 'hex';
  size: { w: number; h: number };
  hole?: { d: number; pos: 'top-left' | 'top-center' | 'top-right' | 'left' | 'right'; margin: number } | null;
  style?: { roundness?: number };
  notes?: string;
};

const DEFAULTS = {
  size: { w: 80, h: 30 },
  hole: { d: 5, pos: 'top-left' as const, margin: 4 },
  roundness: 0.25,
};

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function getNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function extractJsonCandidate(raw: string): string {
  const text = (raw ?? '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

export function parseShapeSpec(raw: string): { spec: ShapeSpec | null; errors: string[] } {
  const errors: string[] = [];
  const text = extractJsonCandidate(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { spec: null, errors: ['Invalid JSON (could not parse)'] };
  }

  const obj = asRecord(parsed);
  if (!obj) return { spec: null, errors: ['JSON must be an object'] };

  const allowedShapes: ShapeSpec['shape'][] = ['rounded-rect', 'circle', 'heart', 'bone', 'shield', 'hex'];
  const shapeRaw = obj.shape;
  const shape = (typeof shapeRaw === 'string' && (allowedShapes as string[]).includes(shapeRaw) ? shapeRaw : null) as
    | ShapeSpec['shape']
    | null;

  let finalShape: ShapeSpec['shape'] = 'rounded-rect';
  if (!shape) {
    errors.push('Invalid or missing shape (using rounded-rect fallback)');
  } else {
    finalShape = shape;
  }

  const sizeObj = asRecord(obj.size);
  const wRaw = sizeObj ? getNumber(sizeObj.w) : null;
  const hRaw = sizeObj ? getNumber(sizeObj.h) : null;

  let w = wRaw ?? DEFAULTS.size.w;
  let h = hRaw ?? DEFAULTS.size.h;

  if (wRaw === null) errors.push('Missing/invalid size.w (using default)');
  if (hRaw === null) errors.push('Missing/invalid size.h (using default)');

  const wClamped = clamp(w, 20, 200);
  const hClamped = clamp(h, 20, 200);
  if (wClamped !== w) errors.push('size.w out of range (clamped to 20..200)');
  if (hClamped !== h) errors.push('size.h out of range (clamped to 20..200)');
  w = wClamped;
  h = hClamped;

  const styleObj = asRecord(obj.style);
  const roundnessRaw = styleObj ? getNumber(styleObj.roundness) : null;
  let roundness = roundnessRaw ?? DEFAULTS.roundness;
  if (styleObj && roundnessRaw === null && 'roundness' in styleObj) {
    errors.push('Invalid style.roundness (using default)');
  }
  const roundnessClamped = clamp(roundness, 0, 1);
  if (roundnessClamped !== roundness) errors.push('style.roundness out of range (clamped to 0..1)');
  roundness = roundnessClamped;

  let hole: ShapeSpec['hole'] | undefined;
  if (obj.hole === null) {
    hole = null;
  } else {
    const holeObj = asRecord(obj.hole);
    if (!holeObj) {
      hole = { ...DEFAULTS.hole };
      if ('hole' in obj) {
        errors.push('Invalid hole object (using default hole)');
      }
    } else {
      const dRaw = getNumber(holeObj.d);
      const posRaw = holeObj.pos;
      const marginRaw = getNumber(holeObj.margin);

      const allowedPos: NonNullable<ShapeSpec['hole']>['pos'][] = ['top-left', 'top-center', 'top-right', 'left', 'right'];
      const pos = (typeof posRaw === 'string' && (allowedPos as string[]).includes(posRaw) ? posRaw : null) as
        | NonNullable<ShapeSpec['hole']>['pos']
        | null;

      let d = dRaw ?? DEFAULTS.hole.d;
      let margin = marginRaw ?? DEFAULTS.hole.margin;
      const finalPos = pos ?? DEFAULTS.hole.pos;

      if (dRaw === null) errors.push('Missing/invalid hole.d (using default)');
      if (!pos) errors.push('Missing/invalid hole.pos (using default)');
      if (marginRaw === null) errors.push('Missing/invalid hole.margin (using default)');

      const dClamped = clamp(d, 2, 12);
      const marginClamped = clamp(margin, 0, 20);
      if (dClamped !== d) errors.push('hole.d out of range (clamped to 2..12)');
      if (marginClamped !== margin) errors.push('hole.margin out of range (clamped to 0..20)');
      d = dClamped;
      margin = marginClamped;

      hole = { d, pos: finalPos, margin };
    }
  }

  if (hole === undefined) {
    hole = { ...DEFAULTS.hole };
  }

  const notes = typeof obj.notes === 'string' ? obj.notes : undefined;

  const spec: ShapeSpec = {
    shape: finalShape,
    size: { w, h },
    hole,
    style: { roundness },
    ...(notes ? { notes } : {}),
  };

  return { spec, errors };
}

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

function holeCenter(spec: ShapeSpec, hole: NonNullable<ShapeSpec['hole']>): { cx: number; cy: number; r: number } {
  const w = spec.size.w;
  const h = spec.size.h;
  const r = hole.d / 2;
  const m = hole.margin;

  const leftX = m + r;
  const rightX = w - (m + r);
  const topY = m + r;
  const midY = h / 2;

  let cx: number;
  let cy: number;

  if (hole.pos === 'top-left') {
    cx = leftX;
    cy = topY;
  } else if (hole.pos === 'top-center') {
    cx = w / 2;
    cy = topY;
  } else if (hole.pos === 'top-right') {
    cx = rightX;
    cy = topY;
  } else if (hole.pos === 'left') {
    cx = leftX;
    cy = midY;
  } else {
    cx = rightX;
    cy = midY;
  }

  const cxClamped = Math.max(r, Math.min(w - r, cx));
  const cyClamped = Math.max(r, Math.min(h - r, cy));
  return { cx: cxClamped, cy: cyClamped, r };
}

export function shapeSpecToSvg(spec: ShapeSpec): string {
  const w = spec.size.w;
  const h = spec.size.h;

  const elements: string[] = [];
  elements.push(shapeElements(spec));

  if (spec.hole && spec.hole !== null) {
    const c = holeCenter(spec, spec.hole);
    elements.push(`<circle cx="${round(c.cx)}" cy="${round(c.cy)}" r="${round(c.r)}" />`);
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${round(w)}mm" height="${round(h)}mm" viewBox="0 0 ${round(w)} ${round(h)}"` +
    ` stroke="black" fill="none" stroke-width="0.8" vector-effect="non-scaling-stroke">\n` +
    `${elements.join('\n')}\n` +
    `</svg>`
  );
}

export function formatShapeSpecSummary(spec: ShapeSpec): { title: string; lines: string[] } {
  const lines: string[] = [];
  lines.push(`Shape: ${spec.shape}`);
  lines.push(`Size: ${round(spec.size.w)}×${round(spec.size.h)}mm`);

  if (spec.hole === null) {
    lines.push('Hole: none');
  } else if (spec.hole) {
    lines.push(`Hole: ${round(spec.hole.d)}mm ${spec.hole.pos} (margin ${round(spec.hole.margin)}mm)`);
  }

  const roundness = spec.style?.roundness;
  if (typeof roundness === 'number') {
    lines.push(`Roundness: ${round(roundness)}`);
  }

  return { title: 'Spec summary', lines };
}
