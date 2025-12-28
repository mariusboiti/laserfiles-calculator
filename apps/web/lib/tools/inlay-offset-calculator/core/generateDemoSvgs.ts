import type { PreviewShape } from '../types/inlay';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export type DemoSvgs = {
  inlaySvg: string;
  pocketSvg: string;
};

function svgWrap(inner: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100mm\" height=\"100mm\" viewBox=\"0 0 100 100\">\n  ${inner}\n</svg>`;
}

function circleSvg(radius: number) {
  const r = clamp(radius, 0.1, 48);
  return `<circle cx=\"50\" cy=\"50\" r=\"${r.toFixed(3)}\" fill=\"none\" stroke=\"#000\" stroke-width=\"0.2\" />`;
}

function roundedRectSvg(offset: number) {
  const baseW = 70;
  const baseH = 40;
  const baseR = 6;

  const w = clamp(baseW + 2 * offset, 1, 98);
  const h = clamp(baseH + 2 * offset, 1, 98);
  const r = clamp(baseR + offset, 0, Math.min(w, h) / 2);

  const x = (100 - w) / 2;
  const y = (100 - h) / 2;

  return `<rect x=\"${x.toFixed(3)}\" y=\"${y.toFixed(3)}\" width=\"${w.toFixed(3)}\" height=\"${h.toFixed(3)}\" rx=\"${r.toFixed(3)}\" ry=\"${r.toFixed(3)}\" fill=\"none\" stroke=\"#000\" stroke-width=\"0.2\" />`;
}

export function generateDemoSvgs(shape: PreviewShape, inlayOffsetMm: number, pocketOffsetMm: number): DemoSvgs {
  const baseRadius = 30;

  const inlayInner =
    shape === 'circle' ? circleSvg(baseRadius + inlayOffsetMm) : roundedRectSvg(inlayOffsetMm);
  const pocketInner =
    shape === 'circle' ? circleSvg(baseRadius + pocketOffsetMm) : roundedRectSvg(pocketOffsetMm);

  return {
    inlaySvg: svgWrap(inlayInner),
    pocketSvg: svgWrap(pocketInner),
  };
}
