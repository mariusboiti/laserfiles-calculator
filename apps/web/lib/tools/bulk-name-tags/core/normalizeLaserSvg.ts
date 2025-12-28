export type NormalizeLaserSvgOptions = {
  targetWidthMm: number;
  targetHeightMm: number;
  removeSpecks?: boolean;
};

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

function parseViewBox(vb: string | null): { x: number; y: number; w: number; h: number } | null {
  if (!vb) return null;
  const parts = vb.trim().split(/\s+/).map((p) => Number(p));
  if (parts.length !== 4) return null;
  const [x, y, w, h] = parts;
  if (![x, y, w, h].every((n) => Number.isFinite(n))) return null;
  if (!(w > 0 && h > 0)) return null;
  return { x, y, w, h };
}

function ensureMm(value: string): string {
  const v = value.trim();
  if (/mm\s*$/i.test(v)) return v;
  if (/in\s*$/i.test(v)) return v;
  if (/cm\s*$/i.test(v)) return v;
  if (/px\s*$/i.test(v)) return v;
  const n = Number(v);
  if (Number.isFinite(n)) return `${n}mm`;
  return value;
}

function removeTinyPaths(doc: Document, removeSpecks: boolean | undefined) {
  if (!removeSpecks) return;
  const paths = Array.from(doc.querySelectorAll('path'));
  for (const p of paths) {
    const d = p.getAttribute('d') || '';
    if (d.length > 0 && d.length < 80) {
      p.remove();
    }
  }
}

export function normalizeLaserSvg(svg: string, options: NormalizeLaserSvgOptions): { svg: string; issues: string[] } {
  const issues: string[] = [];
  const raw = (svg || '').trim();
  if (!raw) return { svg: '', issues: ['SVG is empty'] };

  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, 'image/svg+xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    return { svg: '', issues: ['SVG could not be parsed'] };
  }

  const svgEl = doc.querySelector('svg');
  if (!svgEl) {
    return { svg: '', issues: ['Missing <svg> root element'] };
  }

  const forbidden = Array.from(doc.querySelectorAll('script, foreignObject'));
  forbidden.forEach((n) => n.remove());
  if (forbidden.length) issues.push('Removed forbidden elements');

  const images = Array.from(doc.querySelectorAll('image'));
  images.forEach((n) => n.remove());
  if (images.length) issues.push('Removed raster images (<image>)');

  removeTinyPaths(doc, options.removeSpecks);

  if (!svgEl.getAttribute('xmlns')) {
    svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

  const targetW = options.targetWidthMm;
  const targetH = options.targetHeightMm;

  const vb = parseViewBox(svgEl.getAttribute('viewBox'));
  if (!vb) {
    issues.push('Missing viewBox (using target size)');
  }

  const oldChildren = Array.from(svgEl.childNodes);
  const g = doc.createElementNS('http://www.w3.org/2000/svg', 'g');

  // Move all children into the group so we can scale deterministically.
  for (const child of oldChildren) {
    g.appendChild(child);
  }

  const fromW = vb?.w || targetW;
  const fromH = vb?.h || targetH;
  const sx = fromW > 0 ? targetW / fromW : 1;
  const sy = fromH > 0 ? targetH / fromH : 1;

  if (!(Math.abs(sx - 1) < 1e-6 && Math.abs(sy - 1) < 1e-6)) {
    g.setAttribute('transform', `scale(${round(sx)} ${round(sy)})`);
    issues.push('Scaled traced SVG to target mm size');
  }

  svgEl.appendChild(g);

  svgEl.setAttribute('viewBox', `0 0 ${round(targetW)} ${round(targetH)}`);
  svgEl.setAttribute('width', ensureMm(`${round(targetW)}`));
  svgEl.setAttribute('height', ensureMm(`${round(targetH)}`));

  // Laser-safe styling defaults
  svgEl.setAttribute('stroke', 'black');
  svgEl.setAttribute('fill', 'none');
  svgEl.setAttribute('stroke-width', '0.8');
  svgEl.setAttribute('vector-effect', 'non-scaling-stroke');

  const els = Array.from(doc.querySelectorAll('path, rect, circle, ellipse, polygon, polyline, line'));
  els.forEach((el) => {
    el.setAttribute('fill', 'none');
    if (!el.getAttribute('stroke')) el.setAttribute('stroke', 'black');
    if (!el.getAttribute('stroke-width')) el.setAttribute('stroke-width', '0.8');
    el.setAttribute('vector-effect', 'non-scaling-stroke');
  });

  const sanitized = new XMLSerializer().serializeToString(svgEl);
  return { svg: sanitized, issues };
}
