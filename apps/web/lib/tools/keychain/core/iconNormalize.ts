/**
 * Keychain Hub - Icon Normalization
 * Compute bbox, scale, and normalize SVG icons to 100x100 viewBox
 */

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Parse path d string and compute approximate bounding box
 * This is a simplified parser - handles M, L, H, V, C, S, Q, T, A, Z commands
 */
export function computePathBBox(d: string): BBox | null {
  if (!d || !d.trim()) return null;
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;
  
  const updateBounds = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  
  // Tokenize the path
  const commands = d.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];
  
  for (const cmd of commands) {
    const type = cmd[0].toUpperCase();
    const isRelative = cmd[0] === cmd[0].toLowerCase();
    const args = cmd.slice(1).trim().split(/[\s,]+/).filter(Boolean).map(parseFloat);
    
    switch (type) {
      case 'M': // MoveTo
        for (let i = 0; i < args.length; i += 2) {
          if (isRelative) {
            currentX += args[i] || 0;
            currentY += args[i + 1] || 0;
          } else {
            currentX = args[i] || 0;
            currentY = args[i + 1] || 0;
          }
          if (i === 0) {
            startX = currentX;
            startY = currentY;
          }
          updateBounds(currentX, currentY);
        }
        break;
        
      case 'L': // LineTo
        for (let i = 0; i < args.length; i += 2) {
          if (isRelative) {
            currentX += args[i] || 0;
            currentY += args[i + 1] || 0;
          } else {
            currentX = args[i] || 0;
            currentY = args[i + 1] || 0;
          }
          updateBounds(currentX, currentY);
        }
        break;
        
      case 'H': // Horizontal LineTo
        for (const arg of args) {
          currentX = isRelative ? currentX + arg : arg;
          updateBounds(currentX, currentY);
        }
        break;
        
      case 'V': // Vertical LineTo
        for (const arg of args) {
          currentY = isRelative ? currentY + arg : arg;
          updateBounds(currentX, currentY);
        }
        break;
        
      case 'C': // Cubic Bezier
        for (let i = 0; i < args.length; i += 6) {
          const baseX = isRelative ? currentX : 0;
          const baseY = isRelative ? currentY : 0;
          
          // Control points and end point
          updateBounds(baseX + (args[i] || 0), baseY + (args[i + 1] || 0));
          updateBounds(baseX + (args[i + 2] || 0), baseY + (args[i + 3] || 0));
          currentX = baseX + (args[i + 4] || 0);
          currentY = baseY + (args[i + 5] || 0);
          updateBounds(currentX, currentY);
        }
        break;
        
      case 'S': // Smooth Cubic Bezier
        for (let i = 0; i < args.length; i += 4) {
          const baseX = isRelative ? currentX : 0;
          const baseY = isRelative ? currentY : 0;
          
          updateBounds(baseX + (args[i] || 0), baseY + (args[i + 1] || 0));
          currentX = baseX + (args[i + 2] || 0);
          currentY = baseY + (args[i + 3] || 0);
          updateBounds(currentX, currentY);
        }
        break;
        
      case 'Q': // Quadratic Bezier
        for (let i = 0; i < args.length; i += 4) {
          const baseX = isRelative ? currentX : 0;
          const baseY = isRelative ? currentY : 0;
          
          updateBounds(baseX + (args[i] || 0), baseY + (args[i + 1] || 0));
          currentX = baseX + (args[i + 2] || 0);
          currentY = baseY + (args[i + 3] || 0);
          updateBounds(currentX, currentY);
        }
        break;
        
      case 'T': // Smooth Quadratic Bezier
        for (let i = 0; i < args.length; i += 2) {
          if (isRelative) {
            currentX += args[i] || 0;
            currentY += args[i + 1] || 0;
          } else {
            currentX = args[i] || 0;
            currentY = args[i + 1] || 0;
          }
          updateBounds(currentX, currentY);
        }
        break;
        
      case 'A': // Arc
        for (let i = 0; i < args.length; i += 7) {
          const rx = args[i] || 0;
          const ry = args[i + 1] || 0;
          const baseX = isRelative ? currentX : 0;
          const baseY = isRelative ? currentY : 0;
          
          const endX = baseX + (args[i + 5] || 0);
          const endY = baseY + (args[i + 6] || 0);
          
          // Approximate arc bounds using control box
          const midX = (currentX + endX) / 2;
          const midY = (currentY + endY) / 2;
          updateBounds(midX - rx, midY - ry);
          updateBounds(midX + rx, midY + ry);
          
          currentX = endX;
          currentY = endY;
          updateBounds(currentX, currentY);
        }
        break;
        
      case 'Z': // ClosePath
        currentX = startX;
        currentY = startY;
        break;
    }
  }
  
  if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) {
    return null;
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Compute combined bounding box for multiple paths
 */
export function computeCombinedBBox(paths: string[]): BBox | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  for (const d of paths) {
    const bbox = computePathBBox(d);
    if (bbox) {
      minX = Math.min(minX, bbox.x);
      minY = Math.min(minY, bbox.y);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      maxY = Math.max(maxY, bbox.y + bbox.height);
    }
  }
  
  if (minX === Infinity) return null;
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Transform path d string by applying scale and translate
 */
export function transformPath(d: string, scale: number, translateX: number, translateY: number): string {
  // This transforms absolute coordinates in the path
  const commands = d.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];
  let result = '';
  
  for (const cmd of commands) {
    const type = cmd[0];
    const isRelative = type === type.toLowerCase();
    const args = cmd.slice(1).trim().split(/[\s,]+/).filter(Boolean).map(parseFloat);
    
    const upperType = type.toUpperCase();
    let transformed: number[] = [];
    
    switch (upperType) {
      case 'M':
      case 'L':
      case 'T':
        // x,y pairs
        for (let i = 0; i < args.length; i += 2) {
          if (isRelative) {
            transformed.push(args[i] * scale, args[i + 1] * scale);
          } else {
            transformed.push(args[i] * scale + translateX, args[i + 1] * scale + translateY);
          }
        }
        break;
        
      case 'H':
        for (const arg of args) {
          if (isRelative) {
            transformed.push(arg * scale);
          } else {
            transformed.push(arg * scale + translateX);
          }
        }
        break;
        
      case 'V':
        for (const arg of args) {
          if (isRelative) {
            transformed.push(arg * scale);
          } else {
            transformed.push(arg * scale + translateY);
          }
        }
        break;
        
      case 'C':
        // x1,y1 x2,y2 x,y
        for (let i = 0; i < args.length; i += 6) {
          if (isRelative) {
            transformed.push(
              args[i] * scale, args[i + 1] * scale,
              args[i + 2] * scale, args[i + 3] * scale,
              args[i + 4] * scale, args[i + 5] * scale
            );
          } else {
            transformed.push(
              args[i] * scale + translateX, args[i + 1] * scale + translateY,
              args[i + 2] * scale + translateX, args[i + 3] * scale + translateY,
              args[i + 4] * scale + translateX, args[i + 5] * scale + translateY
            );
          }
        }
        break;
        
      case 'S':
      case 'Q':
        // x1,y1 x,y or x2,y2 x,y
        for (let i = 0; i < args.length; i += 4) {
          if (isRelative) {
            transformed.push(
              args[i] * scale, args[i + 1] * scale,
              args[i + 2] * scale, args[i + 3] * scale
            );
          } else {
            transformed.push(
              args[i] * scale + translateX, args[i + 1] * scale + translateY,
              args[i + 2] * scale + translateX, args[i + 3] * scale + translateY
            );
          }
        }
        break;
        
      case 'A':
        // rx,ry rotation large-arc sweep x,y
        for (let i = 0; i < args.length; i += 7) {
          if (isRelative) {
            transformed.push(
              args[i] * scale, args[i + 1] * scale, // rx, ry scaled
              args[i + 2], args[i + 3], args[i + 4], // rotation, flags unchanged
              args[i + 5] * scale, args[i + 6] * scale
            );
          } else {
            transformed.push(
              args[i] * scale, args[i + 1] * scale,
              args[i + 2], args[i + 3], args[i + 4],
              args[i + 5] * scale + translateX, args[i + 6] * scale + translateY
            );
          }
        }
        break;
        
      case 'Z':
        // No args
        break;
    }
    
    result += type + transformed.map(n => n.toFixed(2)).join(' ') + ' ';
  }
  
  return result.trim();
}

/**
 * Normalize paths to fit within 100x100 with padding
 */
export function normalizePaths(paths: string[], padding: number = 6): string[] {
  const bbox = computeCombinedBBox(paths);
  if (!bbox || bbox.width === 0 || bbox.height === 0) {
    return paths;
  }
  
  const targetSize = 100 - padding * 2;
  const scale = Math.min(targetSize / bbox.width, targetSize / bbox.height);
  
  // Center in 100x100
  const scaledWidth = bbox.width * scale;
  const scaledHeight = bbox.height * scale;
  const translateX = padding + (targetSize - scaledWidth) / 2 - bbox.x * scale;
  const translateY = padding + (targetSize - scaledHeight) / 2 - bbox.y * scale;
  
  return paths.map(d => transformPath(d, scale, translateX, translateY));
}

/**
 * Normalize entire SVG string
 */
export function normalizeSvg(svg: string, padding: number = 6): string {
  if (typeof DOMParser === 'undefined') {
    return svg; // Can't normalize without DOM
  }
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (!svgEl) return svg;
    
    // Extract paths
    const pathEls = svgEl.querySelectorAll('path');
    const paths: string[] = [];
    pathEls.forEach(p => {
      const d = p.getAttribute('d');
      if (d) paths.push(d);
    });
    
    if (paths.length === 0) return svg;
    
    // Normalize
    const normalized = normalizePaths(paths, padding);
    
    // Update paths in SVG
    pathEls.forEach((p, i) => {
      if (normalized[i]) {
        p.setAttribute('d', normalized[i]);
      }
    });
    
    // Set viewBox
    svgEl.setAttribute('viewBox', '0 0 100 100');
    svgEl.removeAttribute('width');
    svgEl.removeAttribute('height');
    
    return new XMLSerializer().serializeToString(svgEl);
  } catch {
    return svg;
  }
}

/**
 * Full normalization pipeline for icon
 */
export function normalizeIcon(svg: string): { svg: string; paths: string[]; normalized: boolean } {
  try {
    const normalized = normalizeSvg(svg);
    
    // Extract final paths
    const paths: string[] = [];
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(normalized, 'image/svg+xml');
      doc.querySelectorAll('path').forEach(p => {
        const d = p.getAttribute('d');
        if (d) paths.push(d);
      });
    }
    
    return { svg: normalized, paths, normalized: true };
  } catch {
    return { svg, paths: [], normalized: false };
  }
}
