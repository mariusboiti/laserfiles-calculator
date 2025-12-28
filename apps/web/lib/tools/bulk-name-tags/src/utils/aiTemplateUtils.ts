export function extractSvgFromAiResponse(responseText: string): { svg: string | null; reason?: string } {
  const original = (responseText || '').trim();
  if (!original) return { svg: null, reason: 'empty_response' };

  const cleaned = stripCodeFences(original).trim();

  const parsed = safeJsonParse(cleaned);
  if (parsed) {
    const fromJson =
      pickPathString(parsed, ['svg']) ||
      pickPathString(parsed, ['template', 'svg']) ||
      pickPathString(parsed, ['data', 'svg']);

    if (fromJson) {
      const normalized = normalizeSvgString(fromJson);
      const finalized = finalizeSvg(normalized);
      return finalized ? { svg: finalized } : { svg: null, reason: 'json_svg_invalid' };
    }
  }

  const match = cleaned.match(/<svg[\s\S]*?<\/svg>/i);
  if (match?.[0]) {
    const normalized = normalizeSvgString(match[0]);
    const finalized = finalizeSvg(normalized);
    return finalized ? { svg: finalized } : { svg: null, reason: 'regex_svg_invalid' };
  }

  const idx = cleaned.toLowerCase().indexOf('<svg');
  if (idx >= 0) {
    const tail = cleaned.slice(idx);
    const normalized = normalizeSvgString(tail);
    const finalized = finalizeSvg(normalized);
    return finalized ? { svg: finalized } : { svg: null, reason: 'svg_missing_close_tag' };
  }

  return { svg: null, reason: 'no_svg_found' };
}

export function validateLaserSafeSvg(svg: string): { ok: boolean; issues: string[]; sanitizedSvg?: string } {
  const issues: string[] = [];
  const raw = (svg || '').trim();

  if (!raw) return { ok: false, issues: ['SVG is empty'] };
  if (!/^<svg\b/i.test(raw) || !/<\/svg>\s*$/i.test(raw)) {
    issues.push('SVG must start with <svg> and end with </svg>');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, 'image/svg+xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    return { ok: false, issues: ['SVG could not be parsed'] };
  }

  const svgEl = doc.querySelector('svg');
  if (!svgEl) {
    return { ok: false, issues: ['Missing <svg> root element'] };
  }

  const forbidden = Array.from(doc.querySelectorAll('script, foreignObject'));
  if (forbidden.length) {
    issues.push('Removed forbidden elements: script/foreignObject');
    forbidden.forEach((n) => n.remove());
  }

  const images = Array.from(doc.querySelectorAll('image'));
  if (images.length) {
    issues.push('Removed raster images (<image>)');
    images.forEach((n) => n.remove());
  }

  if (!svgEl.getAttribute('xmlns')) {
    svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

  const viewBox = svgEl.getAttribute('viewBox');
  const widthAttr = svgEl.getAttribute('width') || '';
  const heightAttr = svgEl.getAttribute('height') || '';
  const widthNum = parseLengthNumber(widthAttr);
  const heightNum = parseLengthNumber(heightAttr);

  if (!viewBox) {
    if (Number.isFinite(widthNum) && Number.isFinite(heightNum) && widthNum > 0 && heightNum > 0) {
      svgEl.setAttribute('viewBox', `0 0 ${widthNum} ${heightNum}`);
      issues.push('Added missing viewBox from width/height');
    } else {
      issues.push('Missing viewBox (and cannot infer from width/height)');
    }
  }

  if (widthAttr && !hasUnit(widthAttr)) {
    svgEl.setAttribute('width', `${widthAttr}mm`);
    issues.push('Normalized width to mm units');
  }
  if (heightAttr && !hasUnit(heightAttr)) {
    svgEl.setAttribute('height', `${heightAttr}mm`);
    issues.push('Normalized height to mm units');
  }

  const allowedTags = new Set([
    'svg',
    'g',
    'path',
    'rect',
    'circle',
    'ellipse',
    'polygon',
    'polyline',
    'line',
    'defs',
    'style',
    'metadata',
    'title',
    'desc',
    'text'
  ]);

  const allElements = Array.from(doc.querySelectorAll('*'));
  allElements.forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (!allowedTags.has(tag)) {
      issues.push(`Removed unsupported element <${tag}>`);
      el.remove();
    }
  });

  const shapeEls = Array.from(doc.querySelectorAll('path, rect, circle, ellipse, polygon, polyline, line'));
  if (!shapeEls.length) {
    issues.push('No shape elements found (path/rect/circle/ellipse/polygon/polyline/line)');
  }

  shapeEls.forEach((el) => {
    el.setAttribute('fill', 'none');
    if (!el.getAttribute('stroke')) el.setAttribute('stroke', 'black');
    if (!el.getAttribute('stroke-width')) el.setAttribute('stroke-width', '0.8');
    el.setAttribute('vector-effect', 'non-scaling-stroke');
  });

  if (!svgEl.getAttribute('stroke')) svgEl.setAttribute('stroke', 'black');
  if (!svgEl.getAttribute('fill')) svgEl.setAttribute('fill', 'none');
  if (!svgEl.getAttribute('stroke-width')) svgEl.setAttribute('stroke-width', '0.8');
  svgEl.setAttribute('vector-effect', 'non-scaling-stroke');

  const serializer = new XMLSerializer();
  const sanitizedSvg = serializer.serializeToString(svgEl);

  const critical = issues.some((i) => {
    const s = i.toLowerCase();
    return (
      s.includes('svg is empty') ||
      s.includes('could not be parsed') ||
      s.includes('missing <svg> root') ||
      s.includes('svg must start') ||
      s.includes('missing viewbox (and cannot infer') ||
      s.includes('no shape elements')
    );
  });

  return { ok: !critical, issues, sanitizedSvg };
}

function stripCodeFences(text: string): string {
  const t = (text || '').trim();
  return t.replace(/^```[a-zA-Z]*\s*/i, '').replace(/```\s*$/i, '').trim();
}

function safeJsonParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function pickPathString(obj: any, path: string[]): string | null {
  let cur = obj;
  for (const key of path) {
    if (!cur || typeof cur !== 'object') return null;
    cur = cur[key];
  }
  return typeof cur === 'string' ? cur : null;
}

function normalizeSvgString(value: string): string {
  const v = (value || '').trim();
  return unescapeLikelyJsonString(stripCodeFences(v)).trim();
}

function unescapeLikelyJsonString(value: string): string {
  if (!value) return value;

  if (value.includes('\\"') || value.includes('\\n') || value.includes('\\t') || value.includes('\\/')) {
    return value
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\\"/g, '"')
      .replace(/\\\'/g, "'")
      .replace(/\\\//g, '/');
  }

  return value;
}

function finalizeSvg(candidate: string): string | null {
  const c = (candidate || '').trim();
  if (!c) return null;

  const start = c.toLowerCase().indexOf('<svg');
  if (start < 0) return null;

  const tail = c.slice(start);
  const endIdx = tail.toLowerCase().indexOf('</svg>');
  if (endIdx >= 0) {
    const full = tail.slice(0, endIdx + '</svg>'.length).trim();
    return /^<svg\b/i.test(full) ? full : null;
  }

  return `${tail.trim()}\n</svg>`;
}

function parseLengthNumber(value: string): number {
  const v = (value || '').trim();
  if (!v) return Number.NaN;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : Number.NaN;
}

function hasUnit(value: string): boolean {
  return /(mm|in)\s*$/i.test((value || '').trim());
}
