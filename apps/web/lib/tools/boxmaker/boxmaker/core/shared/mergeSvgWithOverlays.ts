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
    const s = Math.max(item.placement.scale, 0.01);

    // Place the imported artwork using the same convention as the legacy Simple Box:
    // (x,y) is the center position in the panel coordinate system.
    parts.push(
      `<g transform="translate(${item.placement.x.toFixed(3)} ${item.placement.y.toFixed(3)}) rotate(${rotDeg.toFixed(
        3,
      )}) scale(${s.toFixed(5)}) translate(${(-w / 2 + ox).toFixed(3)} ${(-h / 2 + oy).toFixed(3)})">`,
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
  if (!baseSvg.includes('</svg>')) return baseSvg;
  return baseSvg.replace('</svg>', `${overlay}</svg>`);
}
