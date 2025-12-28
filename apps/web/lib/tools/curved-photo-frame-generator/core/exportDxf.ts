// Minimal DXF export for the Curved Photo Frame Generator.
// We sample SVG paths in-browser (same trick as boxmaker dxfExport) so we avoid bringing new heavy libs.

type Point = { x: number; y: number };

function pushGroup(parts: string[], code: number | string, value: number | string) {
  parts.push(String(code));
  parts.push(String(value));
}

function layerTableEntry(name: string, color: number): string[] {
  const p: string[] = [];
  pushGroup(p, 0, 'LAYER');
  pushGroup(p, 2, name);
  pushGroup(p, 70, 0);
  pushGroup(p, 62, color);
  pushGroup(p, 6, 'CONTINUOUS');
  return p;
}

function writeLwPolyline(parts: string[], layer: string, points: Point[], closed: boolean) {
  pushGroup(parts, 0, 'LWPOLYLINE');
  pushGroup(parts, 8, layer);
  pushGroup(parts, 90, points.length);
  pushGroup(parts, 70, closed ? 1 : 0);
  for (const pt of points) {
    pushGroup(parts, 10, pt.x);
    pushGroup(parts, 20, pt.y);
  }
}

function samplePathPoints(d: string, stepMm: number): { points: Point[]; closed: boolean } {
  if (typeof document === 'undefined') return { points: [], closed: false };

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.style.left = '-100000px';
  svg.style.top = '-100000px';
  svg.style.visibility = 'hidden';

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  svg.appendChild(path);
  document.body.appendChild(svg);

  try {
    const total = path.getTotalLength();
    if (!Number.isFinite(total) || total <= 0) return { points: [], closed: false };

    const steps = Math.max(2, Math.ceil(total / Math.max(stepMm, 0.25)) + 1);
    const points: Point[] = [];
    for (let i = 0; i < steps; i += 1) {
      const t = (i / (steps - 1)) * total;
      const pt = path.getPointAtLength(t);
      points.push({ x: pt.x, y: pt.y });
    }

    const hasClose = /[Zz]\s*$/.test(d.trim()) || /[Zz]/.test(d);
    const first = points[0];
    const last = points[points.length - 1];
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const dist2 = dx * dx + dy * dy;
    const closed = hasClose || dist2 < 1e-6;

    if (closed && points.length > 1) {
      points[points.length - 1] = { x: first.x, y: first.y };
    }

    return { points, closed };
  } catch {
    return { points: [], closed: false };
  } finally {
    try {
      document.body.removeChild(svg);
    } catch {
      // ignore
    }
  }
}

function parseSvgPathsByLayer(svgText: string): { layer: string; dList: string[] }[] {
  const out: Record<string, string[]> = { CUT: [], SCORE: [], ENGRAVE: [] };

  try {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const groups = Array.from(doc.querySelectorAll('g[data-op]'));
    for (const g of groups) {
      const op = g.getAttribute('data-op') || '';
      const layer = op === 'cut' ? 'CUT' : op === 'score' ? 'SCORE' : 'ENGRAVE';
      const paths = Array.from(g.querySelectorAll('path'));
      for (const p of paths) {
        const d = p.getAttribute('d');
        if (d) out[layer].push(d);
      }
    }
  } catch {
    // ignore
  }

  return Object.entries(out).map(([layer, dList]) => ({ layer, dList }));
}

export function exportCurvedFrameDxf(svgText: string): string {
  const parts: string[] = [];

  pushGroup(parts, 0, 'SECTION');
  pushGroup(parts, 2, 'HEADER');
  pushGroup(parts, 0, 'ENDSEC');

  pushGroup(parts, 0, 'SECTION');
  pushGroup(parts, 2, 'TABLES');

  pushGroup(parts, 0, 'TABLE');
  pushGroup(parts, 2, 'LAYER');
  pushGroup(parts, 70, 3);
  parts.push(...layerTableEntry('CUT', 1));
  parts.push(...layerTableEntry('SCORE', 5));
  parts.push(...layerTableEntry('ENGRAVE', 7));
  pushGroup(parts, 0, 'ENDTAB');
  pushGroup(parts, 0, 'ENDSEC');

  pushGroup(parts, 0, 'SECTION');
  pushGroup(parts, 2, 'ENTITIES');

  const byLayer = parseSvgPathsByLayer(svgText);
  const stepMm = 0.6;

  for (const entry of byLayer) {
    for (const d of entry.dList) {
      const sampled = samplePathPoints(d, stepMm);
      if (sampled.points.length >= 2) {
        writeLwPolyline(parts, entry.layer, sampled.points, sampled.closed);
      }
    }
  }

  pushGroup(parts, 0, 'ENDSEC');
  pushGroup(parts, 0, 'EOF');

  return parts.join('\n');
}
