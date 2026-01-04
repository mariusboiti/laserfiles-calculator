/**
 * Wrap traced SVG paths in a proper laser-safe SVG with correct viewBox and dimensions.
 * Handles cases where traced output has missing or incorrect viewBox.
 */

export type WrapOptions = {
  targetWidthMm: number;
  targetHeightMm: number;
  canvasWidth: number;
  canvasHeight: number;
  marginMm?: number;
};

export type WrapResult = {
  svg: string;
  issues: string[];
};

/**
 * Extract inner content (paths, groups) from traced SVG and wrap in proper SVG element.
 * Creates a new SVG with:
 * - width/height in mm
 * - viewBox matching canvas coordinates
 * - laser-safe attributes (stroke, fill, vector-effect)
 * - scaled and centered content to fit target area with margins
 */
export function wrapTracedSvg(tracedSvg: string, options: WrapOptions): WrapResult {
  const issues: string[] = [];
  const { targetWidthMm, targetHeightMm, canvasWidth, canvasHeight, marginMm = 2 } = options;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(tracedSvg, 'image/svg+xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      issues.push('Traced SVG parse error');
      return { svg: '', issues };
    }

    const tracedSvgEl = doc.querySelector('svg');
    if (!tracedSvgEl) {
      issues.push('No <svg> element in traced output');
      return { svg: '', issues };
    }

    const paths = Array.from(tracedSvgEl.querySelectorAll('path'));
    const groups = Array.from(tracedSvgEl.querySelectorAll('g'));
    
    if (paths.length === 0 && groups.length === 0) {
      issues.push('Traced SVG contains no paths or groups');
      return { svg: '', issues };
    }

    issues.push(`extracted ${paths.length} paths, ${groups.length} groups`);

    let contentBbox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    let hasValidBbox = false;

    paths.forEach((path) => {
      try {
        const bbox = path.getBBox();
        if (bbox.width > 0 && bbox.height > 0) {
          contentBbox.minX = Math.min(contentBbox.minX, bbox.x);
          contentBbox.minY = Math.min(contentBbox.minY, bbox.y);
          contentBbox.maxX = Math.max(contentBbox.maxX, bbox.x + bbox.width);
          contentBbox.maxY = Math.max(contentBbox.maxY, bbox.y + bbox.height);
          hasValidBbox = true;
        }
      } catch {
        // getBBox can fail, ignore
      }
    });

    if (!hasValidBbox) {
      contentBbox = { minX: 0, minY: 0, maxX: canvasWidth, maxY: canvasHeight };
      issues.push('could not compute bbox, using canvas size');
    } else {
      const bw = contentBbox.maxX - contentBbox.minX;
      const bh = contentBbox.maxY - contentBbox.minY;
      issues.push(`content bbox: ${bw.toFixed(1)}x${bh.toFixed(1)} at (${contentBbox.minX.toFixed(1)},${contentBbox.minY.toFixed(1)})`);
    }

    const contentW = contentBbox.maxX - contentBbox.minX;
    const contentH = contentBbox.maxY - contentBbox.minY;

    const availableW = targetWidthMm - marginMm * 2;
    const availableH = targetHeightMm - marginMm * 2;

    const scaleX = availableW / contentW;
    const scaleY = availableH / contentH;
    const scale = Math.min(scaleX, scaleY);

    const scaledW = contentW * scale;
    const scaledH = contentH * scale;

    const offsetX = marginMm + (availableW - scaledW) / 2;
    const offsetY = marginMm + (availableH - scaledH) / 2;

    issues.push(`scale: ${scale.toFixed(3)}, offset: (${offsetX.toFixed(2)},${offsetY.toFixed(2)})mm`);

    const translateX = offsetX - contentBbox.minX * scale;
    const translateY = offsetY - contentBbox.minY * scale;

    const innerContent: string[] = [];
    
    paths.forEach((path) => {
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'black');
      if (!path.getAttribute('stroke-width')) {
        path.setAttribute('stroke-width', '0.8');
      }
      path.setAttribute('vector-effect', 'non-scaling-stroke');
      innerContent.push(new XMLSerializer().serializeToString(path));
    });

    groups.forEach((g) => {
      const groupPaths = g.querySelectorAll('path');
      groupPaths.forEach((path) => {
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'black');
        if (!path.getAttribute('stroke-width')) {
          path.setAttribute('stroke-width', '0.8');
        }
        path.setAttribute('vector-effect', 'non-scaling-stroke');
      });
      innerContent.push(new XMLSerializer().serializeToString(g));
    });

    const wrappedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${targetWidthMm}mm" height="${targetHeightMm}mm" viewBox="0 0 ${targetWidthMm} ${targetHeightMm}" fill="none" stroke="black" stroke-width="0.8" vector-effect="non-scaling-stroke">
  <g transform="translate(${translateX.toFixed(3)}, ${translateY.toFixed(3)}) scale(${scale.toFixed(6)})">
    ${innerContent.join('\n    ')}
  </g>
</svg>`;

    return { svg: wrappedSvg, issues };
  } catch (err) {
    issues.push(`wrap error: ${err instanceof Error ? err.message : String(err)}`);
    return { svg: '', issues };
  }
}
