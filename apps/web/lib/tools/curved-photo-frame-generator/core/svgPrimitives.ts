type Pt = { x: number; y: number };

export function clampNumber(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  const x0 = x;
  const y0 = y;
  const x1 = x + w;
  const y1 = y + h;

  // SVG arc shorthand: A rx ry xAxisRot largeArc sweep x y
  return [
    `M ${x0 + rr} ${y0}`,
    `L ${x1 - rr} ${y0}`,
    `A ${rr} ${rr} 0 0 1 ${x1} ${y0 + rr}`,
    `L ${x1} ${y1 - rr}`,
    `A ${rr} ${rr} 0 0 1 ${x1 - rr} ${y1}`,
    `L ${x0 + rr} ${y1}`,
    `A ${rr} ${rr} 0 0 1 ${x0} ${y1 - rr}`,
    `L ${x0} ${y0 + rr}`,
    `A ${rr} ${rr} 0 0 1 ${x0 + rr} ${y0}`,
    'Z',
  ].join(' ');
}

export function rectPath(x: number, y: number, w: number, h: number): string {
  return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

export function linePath(x1: number, y1: number, x2: number, y2: number): string {
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

export function translatePath(d: string, dx: number, dy: number): string {
  // For our primitives we avoid heavy path transforms; return d and apply <g transform> at call sites.
  void dx;
  void dy;
  return d;
}

export function safeViewBox(w: number, h: number): { w: number; h: number } {
  return {
    w: Math.max(10, Number.isFinite(w) ? w : 100),
    h: Math.max(10, Number.isFinite(h) ? h : 100),
  };
}

export function svgWrap(args: { w: number; h: number; body: string }): string {
  const { w, h } = safeViewBox(args.w, args.h);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(
    3,
  )}mm" height="${h.toFixed(3)}mm" viewBox="0 0 ${w.toFixed(3)} ${h.toFixed(3)}">\n${args.body}\n</svg>`;
}

export function svgLayerGroup(op: 'cut' | 'score' | 'engrave', body: string): string {
  const stroke = op === 'cut' ? '#ff0000' : op === 'score' ? '#0000ff' : '#000000';
  const fill = op === 'engrave' ? '#000000' : 'none';
  const sw = op === 'engrave' ? 0 : 0.2;
  return `<g data-op="${op}" stroke="${stroke}" fill="${fill}" stroke-width="${sw}" vector-effect="non-scaling-stroke">${body}</g>`;
}

export function pathEl(d: string, extra?: string): string {
  return `<path d="${d}" ${extra ?? ''} />`;
}

export function imageEl(args: {
  href: string;
  x: number;
  y: number;
  w: number;
  h: number;
  opacity?: number;
}): string {
  const op = args.opacity ?? 0.85;
  // Note: embedded raster is for preview/engrave; some laser SW may ignore it.
  return `<image href="${args.href}" x="${args.x.toFixed(3)}" y="${args.y.toFixed(3)}" width="${args.w.toFixed(
    3,
  )}" height="${args.h.toFixed(3)}" preserveAspectRatio="xMidYMid slice" opacity="${op}" />`;
}

export function textEl(args: {
  text: string;
  x: number;
  y: number;
  size: number;
  anchor?: 'start' | 'middle' | 'end';
}): string {
  const a = args.anchor ?? 'middle';
  const safe = (args.text ?? '').replace(/[<>&]/g, (m) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[m] as string));
  return `<text x="${args.x.toFixed(3)}" y="${args.y.toFixed(3)}" font-size="${Math.max(1, args.size).toFixed(
    3,
  )}" text-anchor="${a}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${safe}</text>`;
}

export function kerfSafeSegmentCount(len: number, targetSegMm: number): number {
  const seg = Math.max(0.5, targetSegMm);
  return Math.max(8, Math.ceil(Math.max(len, 10) / seg));
}

export function polylinePoints(points: Pt[]): string {
  return points.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(' ');
}
