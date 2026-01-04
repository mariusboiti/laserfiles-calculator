export type BuiltInTemplate = {
  key: string;
  name: string;
  svgText: string;
  thumbnailSvg: string;
  hasHole?: boolean;
};

function normalizeThumb(svg: string): string {
  return svg
    .replace(/<\?xml[^>]*>\s*/gi, '')
    .replace(/\s+width=["'][^"']*["']/gi, '')
    .replace(/\s+height=["'][^"']*["']/gi, '')
    .trim();
}

const STROKE = '#ff0000';
const SW = 0.2;

function svgDoc(w: number, h: number, inner: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">\n${inner}\n</svg>`;
}

function thumbDoc(w: number, h: number, inner: string): string {
  const pad = Math.max(1, Math.min(w, h) * 0.06);
  return normalizeThumb(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`,
  );
}

// Generate template with customizable hole
export function generateTemplateWithHole(key: string, holeRadius: number, holeYOffset: number): BuiltInTemplate | null {
  const template = BUILT_IN_TEMPLATES.find(t => t.key === key);
  if (!template || !template.hasHole) return null;

  let inner = '';
  let w = 0;
  let h = 0;
  let cx = 0;
  let cy = 0;

  switch (key) {
    case 'circle-ornament-hole':
      w = 60;
      h = 60;
      cx = 30;
      cy = holeYOffset;
      inner = `  <circle cx="30" cy="30" r="28" fill="none" stroke="${STROKE}" stroke-width="${SW}" />\n  <circle cx="${cx}" cy="${cy}" r="${holeRadius}" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`;
      break;
    case 'heart-ornament-hole':
      w = 62;
      h = 58;
      cx = 31;
      cy = holeYOffset;
      inner = `  <path d="M31,54 C20,44 6,36 6,22 C6,12 14,6 22,6 C27,6 30,9 31,10 C32,9 35,6 40,6 C48,6 56,12 56,22 C56,36 42,44 31,54 Z" fill="none" stroke="${STROKE}" stroke-width="${SW}" />\n  <circle cx="${cx}" cy="${cy}" r="${holeRadius}" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`;
      break;
    case 'star-ornament-hole':
      w = 70;
      h = 70;
      cx = 35;
      cy = holeYOffset;
      inner = `  <path d="M35,4 L43,26 L66,26 L47,40 L54,63 L35,49 L16,63 L23,40 L4,26 L27,26 Z" fill="none" stroke="${STROKE}" stroke-width="${SW}" />\n  <circle cx="${cx}" cy="${cy}" r="${holeRadius}" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`;
      break;
    default:
      return null;
  }

  return {
    key,
    name: template.name,
    svgText: svgDoc(w, h, inner),
    thumbnailSvg: thumbDoc(w, h, inner),
    hasHole: true,
  };
}

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    key: 'circle-ornament-hole',
    name: 'Circle Ornament (hole)',
    svgText: svgDoc(
      60,
      60,
      `  <circle cx="30" cy="30" r="28" fill="none" stroke="${STROKE}" stroke-width="${SW}" />\n  <circle cx="30" cy="10" r="2.5" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`,
    ),
    thumbnailSvg: thumbDoc(
      60,
      60,
      `<circle cx="30" cy="30" r="28" fill="none" stroke="${STROKE}" stroke-width="${SW}" />\n<circle cx="30" cy="10" r="2.5" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`,
    ),
    hasHole: true,
  },
  {
    key: 'rounded-rect-nameplate-hole',
    name: 'Rounded Nameplate (hole)',
    svgText: svgDoc(
      90,
      25,
      `  <rect x="1" y="1" width="88" height="23" rx="6" ry="6" fill="none" stroke="${STROKE}" stroke-width="${SW}" />\n  <circle cx="10" cy="12.5" r="2.5" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`,
    ),
    thumbnailSvg: thumbDoc(
      90,
      25,
      `<rect x="1" y="1" width="88" height="23" rx="6" ry="6" fill="none" stroke="${STROKE}" stroke-width="${SW}" />\n<circle cx="10" cy="12.5" r="2.5" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`,
    ),
  },
  {
    key: 'dog-tag',
    name: 'Dog Tag',
    svgText: svgDoc(
      60,
      32,
      `  <rect x="1" y="1" width="58" height="30" rx="14" ry="14" fill="none" stroke="${STROKE}" stroke-width="${SW}" />\n  <circle cx="12" cy="9" r="2.2" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`,
    ),
    thumbnailSvg: thumbDoc(
      60,
      32,
      `<rect x="1" y="1" width="58" height="30" rx="14" ry="14" fill="none" stroke="${STROKE}" stroke-width="${SW}" />\n<circle cx="12" cy="9" r="2.2" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`,
    ),
  },
  {
    key: 'gift-tag',
    name: 'Gift Tag',
    svgText: svgDoc(
      45,
      70,
      `  <path d="M4,1 H41 Q44,1 44,4 V66 Q44,69 41,69 H4 Q1,69 1,66 V4 Q1,1 4,1 Z" fill="none" stroke="${STROKE}" stroke-width="${SW}" />\n  <circle cx="22.5" cy="10" r="2.5" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`,
    ),
    thumbnailSvg: thumbDoc(
      45,
      70,
      `<path d="M4,1 H41 Q44,1 44,4 V66 Q44,69 41,69 H4 Q1,69 1,66 V4 Q1,1 4,1 Z" fill="none" stroke="${STROKE}" stroke-width="${SW}" />\n<circle cx="22.5" cy="10" r="2.5" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`,
    ),
  },
  {
    key: 'heart-ornament-hole',
    name: 'Heart Ornament (hole)',
    svgText: svgDoc(
      62,
      58,
      `  <path d="M31,54 C20,44 6,36 6,22 C6,12 14,6 22,6 C27,6 30,9 31,10 C32,9 35,6 40,6 C48,6 56,12 56,22 C56,36 42,44 31,54 Z" fill="none" stroke="${STROKE}" stroke-width="${SW}" />\n  <circle cx="31" cy="16" r="2.4" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`,
    ),
    thumbnailSvg: thumbDoc(
      62,
      58,
      `<path d="M31,54 C20,44 6,36 6,22 C6,12 14,6 22,6 C27,6 30,9 31,10 C32,9 35,6 40,6 C48,6 56,12 56,22 C56,36 42,44 31,54 Z" fill="none" stroke="${STROKE}" stroke-width="${SW}" />\n<circle cx="31" cy="16" r="2.4" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`,
    ),
    hasHole: true,
  },
  {
    key: 'star-ornament-hole',
    name: 'Star Ornament (hole)',
    svgText: svgDoc(
      70,
      70,
      `  <path d="M35,4 L43,26 L66,26 L47,40 L54,63 L35,49 L16,63 L23,40 L4,26 L27,26 Z" fill="none" stroke="${STROKE}" stroke-width="${SW}" />\n  <circle cx="35" cy="18" r="2.5" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`,
    ),
    thumbnailSvg: thumbDoc(
      70,
      70,
      `<path d="M35,4 L43,26 L66,26 L47,40 L54,63 L35,49 L16,63 L23,40 L4,26 L27,26 Z" fill="none" stroke="${STROKE}" stroke-width="${SW}" />\n<circle cx="35" cy="18" r="2.5" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`,
    ),
    hasHole: true,
  },
  {
    key: 'rect-label-two-holes',
    name: 'Rectangle Label (two holes)',
    svgText: svgDoc(
      100,
      30,
      `  <rect x="1" y="1" width="98" height="28" rx="4" ry="4" fill="none" stroke="${STROKE}" stroke-width="${SW}" />\n  <circle cx="12" cy="15" r="2.5" fill="none" stroke="${STROKE}" stroke-width="${SW}" />\n  <circle cx="88" cy="15" r="2.5" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`,
    ),
    thumbnailSvg: thumbDoc(
      100,
      30,
      `<rect x="1" y="1" width="98" height="28" rx="4" ry="4" fill="none" stroke="${STROKE}" stroke-width="${SW}" />\n<circle cx="12" cy="15" r="2.5" fill="none" stroke="${STROKE}" stroke-width="${SW}" />\n<circle cx="88" cy="15" r="2.5" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`,
    ),
  },
  {
    key: 'minimal-badge',
    name: 'Minimal Badge',
    svgText: svgDoc(
      70,
      32,
      `  <rect x="1" y="1" width="68" height="30" rx="10" ry="10" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`,
    ),
    thumbnailSvg: thumbDoc(70, 32, `<rect x="1" y="1" width="68" height="30" rx="10" ry="10" fill="none" stroke="${STROKE}" stroke-width="${SW}" />`),
  },
];
