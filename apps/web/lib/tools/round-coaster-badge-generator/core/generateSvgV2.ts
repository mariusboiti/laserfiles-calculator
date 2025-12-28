/**
 * Round Coaster & Badge Generator V2 - SVG Generation
 * Laser-safe SVG with CUT/ENGRAVE layer grouping
 */

import type { 
  CoasterStateV2, ShapeType, BorderConfig, LayerContent, 
  BuildResultV2, Warning, LayerType 
} from '../types/coasterV2';
import { LAYER_COLORS } from '../types/coasterV2';
import { 
  fitTextToWidth, calculateTextYPositions, transformText 
} from './textFitV2';
import { 
  calculateSafeWidth, generateWarnings, getEffectiveSize, sanitizeBorder 
} from '../config/defaultsV2';

// Generate circle path
function circleToPath(cx: number, cy: number, r: number): string {
  return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
}

// Generate hexagon points
function hexagonPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
}

// Generate hexagon path
function hexagonToPath(cx: number, cy: number, r: number): string {
  const points: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  return `M ${points[0][0]} ${points[0][1]} ` + 
    points.slice(1).map(p => `L ${p[0]} ${p[1]}`).join(' ') + ' Z';
}

// Generate octagon path
function octagonToPath(cx: number, cy: number, r: number): string {
  const points: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i - Math.PI / 8;
    points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  return `M ${points[0][0]} ${points[0][1]} ` + 
    points.slice(1).map(p => `L ${p[0]} ${p[1]}`).join(' ') + ' Z';
}

// Generate shield path
function shieldToPath(cx: number, cy: number, w: number, h: number): string {
  const halfW = w / 2;
  const topY = cy - h / 2;
  const midY = cy + h * 0.1;
  const bottomY = cy + h / 2;
  
  // Shield shape: flat top with rounded corners, pointed bottom
  const cornerR = w * 0.08;
  
  return `M ${cx - halfW + cornerR} ${topY} ` +
    `L ${cx + halfW - cornerR} ${topY} ` +
    `Q ${cx + halfW} ${topY} ${cx + halfW} ${topY + cornerR} ` +
    `L ${cx + halfW} ${midY} ` +
    `Q ${cx + halfW} ${midY + h * 0.15} ${cx} ${bottomY} ` +
    `Q ${cx - halfW} ${midY + h * 0.15} ${cx - halfW} ${midY} ` +
    `L ${cx - halfW} ${topY + cornerR} ` +
    `Q ${cx - halfW} ${topY} ${cx - halfW + cornerR} ${topY} Z`;
}

// Generate scalloped circle path
function scallopedCircleToPath(cx: number, cy: number, r: number, scallops: number = 12): string {
  const points: string[] = [];
  const innerR = r * 0.92;
  
  for (let i = 0; i < scallops; i++) {
    const angle1 = (Math.PI * 2 / scallops) * i;
    const angle2 = (Math.PI * 2 / scallops) * (i + 0.5);
    const angle3 = (Math.PI * 2 / scallops) * (i + 1);
    
    const x1 = cx + r * Math.cos(angle1);
    const y1 = cy + r * Math.sin(angle1);
    const x2 = cx + innerR * Math.cos(angle2);
    const y2 = cy + innerR * Math.sin(angle2);
    const x3 = cx + r * Math.cos(angle3);
    const y3 = cy + r * Math.sin(angle3);
    
    if (i === 0) {
      points.push(`M ${x1} ${y1}`);
    }
    points.push(`Q ${x2} ${y2} ${x3} ${y3}`);
  }
  
  return points.join(' ') + ' Z';
}

// Generate shape outline path
function generateShapePath(
  shape: ShapeType, 
  cx: number, 
  cy: number, 
  size: number,
  width?: number,
  height?: number
): string {
  const r = size / 2;
  
  switch (shape) {
    case 'circle':
      return circleToPath(cx, cy, r);
    case 'hex':
      return hexagonToPath(cx, cy, r);
    case 'octagon':
      return octagonToPath(cx, cy, r);
    case 'scalloped':
      return scallopedCircleToPath(cx, cy, r);
    case 'shield':
      return shieldToPath(cx, cy, width || size, height || size * 1.15);
    default:
      return circleToPath(cx, cy, r);
  }
}

// Generate inner border path (scaled)
function generateInnerShapePath(
  shape: ShapeType,
  cx: number,
  cy: number,
  size: number,
  inset: number,
  width?: number,
  height?: number
): string {
  const r = (size / 2) - inset;
  
  switch (shape) {
    case 'circle':
      return circleToPath(cx, cy, r);
    case 'hex':
      return hexagonToPath(cx, cy, r);
    case 'octagon':
      return octagonToPath(cx, cy, r);
    case 'scalloped':
      return scallopedCircleToPath(cx, cy, r);
    case 'shield': {
      const scale = 1 - (inset * 2 / (width || size));
      const w = ((width || size) - inset * 2);
      const h = ((height || size * 1.15) - inset * 2);
      return shieldToPath(cx, cy, w, h);
    }
    default:
      return circleToPath(cx, cy, r);
  }
}

// Generate hole path
function generateHolePath(
  cx: number, 
  cy: number, 
  holeConfig: CoasterStateV2['hole'],
  size: number
): string[] {
  if (!holeConfig.enabled || holeConfig.position === 'none') {
    return [];
  }
  
  const r = holeConfig.diameter / 2;
  const offset = holeConfig.offset;
  
  if (holeConfig.position === 'top') {
    const holeY = cy - size / 2 + offset + r;
    return [circleToPath(cx, holeY, r)];
  }
  
  if (holeConfig.position === 'sides') {
    const holeY = cy;
    const leftX = cx - size / 2 + offset + r;
    const rightX = cx + size / 2 - offset - r;
    return [
      circleToPath(leftX, holeY, r),
      circleToPath(rightX, holeY, r),
    ];
  }
  
  return [];
}

// Build SVG from state
export function buildCoasterSvgV2(state: CoasterStateV2): BuildResultV2 {
  const { shape, dimensions, border, text, textFit, hole, safeArea, preview, export: exportConfig } = state;
  
  // Calculate effective size
  const isRound = shape === 'circle' || shape === 'hex' || shape === 'octagon' || shape === 'scalloped';
  const size = isRound ? dimensions.diameter : Math.max(dimensions.width, dimensions.height);
  const width = isRound ? size : dimensions.width;
  const height = isRound ? size : dimensions.height;
  
  const cx = width / 2;
  const cy = height / 2;
  
  // Sanitize border
  const safeBorder = sanitizeBorder(border, size);
  
  // Calculate safe text width
  const safeWidth = calculateSafeWidth(shape, size, safeBorder, safeArea.padding);
  
  // Generate warnings
  const warnings = generateWarnings(state);
  
  // Prepare layers
  const cutElements: string[] = [];
  const engraveElements: string[] = [];
  
  // --- CUT LAYER ---
  
  // Outer shape (cut)
  const outerPath = generateShapePath(shape, cx, cy, size, width, height);
  cutElements.push(
    `<path d="${outerPath}" fill="none" stroke="${preview.layerColors ? LAYER_COLORS.CUT : '#000'}" stroke-width="${safeBorder.thickness}"/>`
  );
  
  // Border rings (cut or score)
  if (safeBorder.enabled) {
    const innerPath = generateInnerShapePath(shape, cx, cy, size, safeBorder.inset, width, height);
    cutElements.push(
      `<path d="${innerPath}" fill="none" stroke="${preview.layerColors ? LAYER_COLORS.CUT : '#000'}" stroke-width="${safeBorder.thickness}"/>`
    );
    
    if (safeBorder.doubleBorder) {
      const doubleInset = safeBorder.inset + safeBorder.doubleBorderGap;
      const doublePath = generateInnerShapePath(shape, cx, cy, size, doubleInset, width, height);
      cutElements.push(
        `<path d="${doublePath}" fill="none" stroke="${preview.layerColors ? LAYER_COLORS.CUT : '#000'}" stroke-width="${safeBorder.thickness}"/>`
      );
    }
  }
  
  // Holes (cut)
  const holePaths = generateHolePath(cx, cy, hole, size);
  for (const holePath of holePaths) {
    cutElements.push(
      `<path d="${holePath}" fill="none" stroke="${preview.layerColors ? LAYER_COLORS.CUT : '#000'}" stroke-width="${safeBorder.thickness}"/>`
    );
  }
  
  // --- ENGRAVE LAYER (text) ---
  
  const textColor = preview.layerColors ? LAYER_COLORS.ENGRAVE : '#000';
  const fontFamily = text.fontFamily || 'Arial, Helvetica, sans-serif';
  
  // Transform text
  const topText = transformText(text.top, text.uppercase);
  const centerText = transformText(text.center, text.uppercase);
  const bottomText = transformText(text.bottom, text.uppercase);
  
  // Fit center text (allow split for center only)
  const centerFit = fitTextToWidth(
    centerText,
    safeWidth,
    textFit.fontMin,
    textFit.autoFit ? textFit.fontMaxCenter : textFit.manualFontSize,
    textFit.letterSpacing,
    true, // allow split
    2     // max 2 lines
  );
  
  // Fit top/bottom text (no split)
  const topFit = fitTextToWidth(
    topText,
    safeWidth,
    textFit.fontMin,
    textFit.autoFit ? textFit.fontMaxSmall : textFit.manualFontSize,
    textFit.letterSpacing,
    false
  );
  
  const bottomFit = fitTextToWidth(
    bottomText,
    safeWidth,
    textFit.fontMin,
    textFit.autoFit ? textFit.fontMaxSmall : textFit.manualFontSize,
    textFit.letterSpacing,
    false
  );
  
  // Calculate Y positions
  const yPositions = calculateTextYPositions(
    height,
    !!topText,
    centerFit.lines.length,
    !!bottomText
  );
  
  // Add text scaled warning if applicable
  if (centerFit.scaled && !warnings.find(w => w.id === 'text-scaled')) {
    warnings.push({
      id: 'text-scaled',
      level: 'info',
      message: 'Text auto-scaled to fit',
    });
  }
  
  // Top text
  if (topText && yPositions.yTop) {
    engraveElements.push(
      `<text x="${cx}" y="${yPositions.yTop}" ` +
      `text-anchor="middle" dominant-baseline="middle" ` +
      `font-family="${fontFamily}" font-size="${topFit.fontSize}" font-weight="500" ` +
      `fill="none" stroke="${textColor}" stroke-width="0.3" ` +
      `letter-spacing="${textFit.letterSpacing}">${escapeXml(topFit.lines[0] || '')}</text>`
    );
  }
  
  // Center text (may have multiple lines)
  for (let i = 0; i < centerFit.lines.length; i++) {
    const line = centerFit.lines[i];
    const y = yPositions.yCenter[i] || yPositions.yCenter[0];
    if (line) {
      engraveElements.push(
        `<text x="${cx}" y="${y}" ` +
        `text-anchor="middle" dominant-baseline="middle" ` +
        `font-family="${fontFamily}" font-size="${centerFit.fontSize}" font-weight="700" ` +
        `fill="none" stroke="${textColor}" stroke-width="0.3" ` +
        `letter-spacing="${textFit.letterSpacing}">${escapeXml(line)}</text>`
      );
    }
  }
  
  // Bottom text
  if (bottomText && yPositions.yBottom) {
    engraveElements.push(
      `<text x="${cx}" y="${yPositions.yBottom}" ` +
      `text-anchor="middle" dominant-baseline="middle" ` +
      `font-family="${fontFamily}" font-size="${bottomFit.fontSize}" font-weight="500" ` +
      `fill="none" stroke="${textColor}" stroke-width="0.3" ` +
      `letter-spacing="${textFit.letterSpacing}">${escapeXml(bottomFit.lines[0] || '')}</text>`
    );
  }
  
  // --- BUILD SVG ---
  
  let svgContent = `<svg width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
  
  // Add metadata if enabled
  if (exportConfig.includeMetadata) {
    svgContent += `\n  <metadata>
    <lfs:coaster xmlns:lfs="https://laserfilespro.com/ns">
      <lfs:shape>${shape}</lfs:shape>
      <lfs:width>${width}</lfs:width>
      <lfs:height>${height}</lfs:height>
      <lfs:generator>Round Coaster & Badge Generator V2</lfs:generator>
    </lfs:coaster>
  </metadata>`;
  }
  
  // Safe area guide (preview only)
  if (preview.showSafeArea && safeArea.showGuide) {
    const safeR = (size / 2) - safeArea.padding - (safeBorder.enabled ? safeBorder.inset : 0);
    svgContent += `\n  <!-- Safe Area Guide -->`;
    svgContent += `\n  <circle cx="${cx}" cy="${cy}" r="${safeR}" fill="none" stroke="#00ff00" stroke-width="0.2" stroke-dasharray="2,2" opacity="0.5"/>`;
  }
  
  // Layer groups
  if (exportConfig.layerGrouping) {
    svgContent += `\n  <g id="CUT">`;
    for (const el of cutElements) {
      svgContent += `\n    ${el}`;
    }
    svgContent += `\n  </g>`;
    
    svgContent += `\n  <g id="ENGRAVE">`;
    for (const el of engraveElements) {
      svgContent += `\n    ${el}`;
    }
    svgContent += `\n  </g>`;
  } else {
    for (const el of cutElements) {
      svgContent += `\n  ${el}`;
    }
    for (const el of engraveElements) {
      svgContent += `\n  ${el}`;
    }
  }
  
  svgContent += `\n</svg>`;
  
  // Build layers info
  const layers: LayerContent[] = [
    { id: 'CUT', color: LAYER_COLORS.CUT, elements: cutElements },
    { id: 'ENGRAVE', color: LAYER_COLORS.ENGRAVE, elements: engraveElements },
  ];
  
  return {
    svg: svgContent,
    layers,
    warnings,
    meta: { width, height, shape },
  };
}

// Escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Generate filename
export function generateFilename(state: CoasterStateV2): string {
  const { shape, dimensions, text, export: exportConfig } = state;
  
  const size = shape === 'circle' || shape === 'hex' 
    ? dimensions.diameter 
    : `${dimensions.width}x${dimensions.height}`;
  
  let name = `coaster-${shape}-${size}mm`;
  
  if (text.center) {
    const safeText = text.center
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 20);
    if (safeText) {
      name += `-${safeText}`;
    }
  }
  
  if (exportConfig.includeTimestamp) {
    const date = new Date().toISOString().slice(0, 10);
    name += `-${date}`;
  }
  
  return `${name}.svg`;
}
