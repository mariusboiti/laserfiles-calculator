import type { OrnamentElement, SignDocument, Layer } from '../types/signPro';
import { getOrnamentById } from '../../../assets/ornaments';

function mm(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function renderOrnamentElement(
  element: OrnamentElement,
  layer: Layer,
  doc: SignDocument,
  forExport: boolean
): string {
  const asset = getOrnamentById(element.assetId);
  if (!asset || asset.pathDs.length === 0) return '';

  if (forExport && element.style.targetLayer === 'GUIDE') {
    return '';
  }

  const { xMm, yMm, rotateDeg, scaleX, scaleY } = element.transform;

  // Ornament paths are normalized to 0-100 viewBox
  // We need to: 1) scale, 2) center at origin, 3) rotate, 4) translate to position
  const baseSize = 100;
  const scaledWidth = baseSize * Math.abs(scaleX);
  const scaledHeight = baseSize * Math.abs(scaleY);

  // Build transform: translate to position, then rotate around center, then scale and offset to center
  const transforms: string[] = [];
  
  // Final position
  transforms.push(`translate(${mm(xMm)}, ${mm(yMm)})`);
  
  // Rotate around center
  if (rotateDeg !== 0) {
    transforms.push(`rotate(${rotateDeg})`);
  }
  
  // Scale and center the 0-100 viewBox ornament
  transforms.push(`scale(${scaleX}, ${scaleY})`);
  transforms.push(`translate(${mm(-50)}, ${mm(-50)})`);

  const transformAttr = ` transform="${transforms.join(' ')}"`;

  let stroke = '#000';
  let strokeWidth = 0.2;

  if (element.style.targetLayer === 'CUT') {
    stroke = forExport ? '#000' : '#000';
    strokeWidth = element.style.strokeMm ?? (forExport ? doc.output.cutStrokeMm : 0.2);
  } else if (element.style.targetLayer === 'ENGRAVE') {
    stroke = forExport ? '#ff0000' : '#0066cc';
    strokeWidth = element.style.strokeMm ?? (forExport ? doc.output.engraveStrokeMm : 0.5);
  } else if (element.style.targetLayer === 'GUIDE') {
    stroke = '#00ff00';
    strokeWidth = 0.3;
  }

  // Scale stroke width inversely to maintain visual consistency
  const adjustedStrokeWidth = strokeWidth / Math.abs(scaleX);

  let content = `\n    <g${transformAttr}>`;
  for (const pathD of asset.pathDs) {
    content += `\n      <path d="${pathD}" fill="none" stroke="${stroke}" stroke-width="${mm(adjustedStrokeWidth)}" />`;
  }
  content += '\n    </g>';

  return content;
}

export function computeOrnamentBounds(element: OrnamentElement): { x: number; y: number; width: number; height: number } {
  const { xMm, yMm, scaleX, scaleY } = element.transform;
  
  const baseSize = 100;
  const width = baseSize * Math.abs(scaleX);
  const height = baseSize * Math.abs(scaleY);
  
  return {
    x: xMm - width / 2,
    y: yMm - height / 2,
    width,
    height,
  };
}
