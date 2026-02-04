import type { GeneratedFace, PathOperation } from '../../../src/lib/types';

export type EngraveOverlayItem = {
  id: string;
  fileName: string;
  op: PathOperation;
  face: GeneratedFace;
  placement: {
    x: number;
    y: number;
    rotation: number;
    scale: number;
    scaleX?: number;
    scaleY?: number;
  };
};

function opToStyle(op: PathOperation): { stroke: string; fill: string; strokeWidth: number } {
  if (op === 'cut') return { stroke: '#ff0000', fill: 'none', strokeWidth: 0.2 };
  if (op === 'score') return { stroke: '#0000ff', fill: 'none', strokeWidth: 0.2 };
  return { stroke: 'none', fill: '#000000', strokeWidth: 0 };
}

export function buildOverlayGroupSvg(items: EngraveOverlayItem[]): string {
  if (!items.length) return '';

  const parts: string[] = [];
  parts.push('<g id="boxmaker-overlays">');

  for (const item of items) {
    const w = Math.max(item.face.width, 1);
    const h = Math.max(item.face.height, 1);
    const ox = item.face.offset?.x ?? 0;
    const oy = item.face.offset?.y ?? 0;

    const rotDeg = (item.placement.rotation * 180) / Math.PI;
    const sx = Math.max(item.placement.scaleX ?? item.placement.scale, 0.01);
    const sy = Math.max(item.placement.scaleY ?? item.placement.scale, 0.01);

    // Place the imported artwork using the same convention as the legacy Simple Box:
    // (x,y) is the center position in the panel coordinate system.
    parts.push(
      `<g transform="translate(${item.placement.x.toFixed(3)} ${item.placement.y.toFixed(3)}) rotate(${rotDeg.toFixed(
        3,
      )}) scale(${sx.toFixed(5)} ${sy.toFixed(5)}) translate(${(-w / 2 + ox).toFixed(3)} ${(-h / 2 + oy).toFixed(3)})">`,
    );

    for (const p of item.face.paths ?? []) {
      const style = opToStyle(item.op);
      const ve = style.stroke === 'none' ? '' : ' vector-effect="non-scaling-stroke"';
      const sw = style.strokeWidth > 0 ? ` stroke-width="${style.strokeWidth}"` : '';
      parts.push(
        `<path d="${p.d}" stroke="${style.stroke}" fill="${style.fill}"${sw}${ve} />`,
      );
    }

    parts.push('</g>');
  }

  parts.push('</g>');
  return parts.join('');
}

export function mergeSvgWithOverlays(baseSvg: string, items: EngraveOverlayItem[]): string {
  const overlay = buildOverlayGroupSvg(items);
  if (!overlay) return baseSvg;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(baseSvg, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (!svgEl) return baseSvg;

    const container = svgEl.querySelector('g') ?? svgEl;

    const overlayDoc = parser.parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg">${overlay}</svg>`,
      'image/svg+xml',
    );
    const overlayNode = overlayDoc.querySelector('#boxmaker-overlays');
    if (!overlayNode) return baseSvg;

    container.appendChild(doc.importNode(overlayNode, true));

    const isRedCut = (el: Element) => {
      const stroke = (el.getAttribute('stroke') || '').toLowerCase();
      if (stroke === '#ff0000' || stroke === '#f00' || stroke === 'red' || stroke === 'rgb(255,0,0)') return true;
      const style = (el.getAttribute('style') || '').toLowerCase();
      if (style.includes('stroke:#ff0000') || style.includes('stroke: #ff0000')) return true;
      if (style.includes('stroke:#f00') || style.includes('stroke: #f00')) return true;
      if (style.includes('stroke:red') || style.includes('stroke: red')) return true;
      if (style.includes('stroke:rgb(255,0,0)') || style.includes('stroke: rgb(255,0,0)')) return true;
      return false;
    };

    const parents: Element[] = [container, ...Array.from(container.querySelectorAll('*'))];
    for (const parent of parents) {
      const children = Array.from(parent.children);
      const red = children.filter(isRedCut);
      for (const el of red) parent.appendChild(el);
    }

    return new XMLSerializer().serializeToString(svgEl);
  } catch {
    if (!baseSvg.includes('</svg>')) return baseSvg;
    return baseSvg.replace('</svg>', `${overlay}</svg>`);
  }
}
