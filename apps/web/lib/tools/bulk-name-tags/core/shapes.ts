import type { ShapeSpec } from './aiShapeSpec';

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export function shapeElements(spec: ShapeSpec): string {
  const w = spec.size.w;
  const h = spec.size.h;
  const roundness = clamp(spec.style?.roundness ?? 0.25, 0, 1);

  switch (spec.shape) {
    case 'rounded-rect': {
      const r = clamp(Math.min(w, h) * 0.2 * roundness, 0, Math.min(w, h) / 2);
      return `<rect x="0" y="0" width="${round(w)}" height="${round(h)}" rx="${round(r)}" ry="${round(r)}" />`;
    }
    case 'circle': {
      const r = Math.min(w, h) / 2;
      return `<circle cx="${round(w / 2)}" cy="${round(h / 2)}" r="${round(r)}" />`;
    }
    case 'hex': {
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) / 2;
      const pts: string[] = [];
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i * Math.PI) / 3;
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        pts.push(`${round(x)},${round(y)}`);
      }
      return `<polygon points="${pts.join(' ')}" />`;
    }
    case 'heart': {
      const sx = w / 100;
      const sy = h / 100;
      const d = [
        'M 50 90',
        'C 20 70 0 52 0 30',
        'C 0 12 14 0 32 0',
        'C 42 0 48 6 50 12',
        'C 52 6 58 0 68 0',
        'C 86 0 100 12 100 30',
        'C 100 52 80 70 50 90',
        'Z',
      ].join(' ');
      return `<path d="${d}" transform="scale(${round(sx)} ${round(sy)})" />`;
    }
    case 'shield': {
      const sx = w / 100;
      const sy = h / 120;
      const d = [
        'M 10 0',
        'L 90 0',
        'L 90 60',
        'C 90 90 70 108 50 120',
        'C 30 108 10 90 10 60',
        'Z',
      ].join(' ');
      return `<path d="${d}" transform="scale(${round(sx)} ${round(sy)})" />`;
    }
    case 'bone': {
      const sx = w / 100;
      const sy = h / 50;
      const d = [
        'M 20 10',
        'A 10 10 0 0 1 10 20',
        'A 10 10 0 0 1 20 30',
        'C 25 35 30 33 35 30',
        'L 65 30',
        'C 70 33 75 35 80 30',
        'A 10 10 0 0 1 90 20',
        'A 10 10 0 0 1 80 10',
        'C 75 5 70 7 65 10',
        'L 35 10',
        'C 30 7 25 5 20 10',
        'Z',
      ].join(' ');
      return `<path d="${d}" transform="scale(${round(sx)} ${round(sy)})" />`;
    }
    default:
      return `<rect x="0" y="0" width="${round(w)}" height="${round(h)}" />`;
  }
}
