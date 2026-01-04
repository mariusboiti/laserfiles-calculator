/**
 * Keychain Hub - Paper.js Helpers
 * SVG path boolean operations using Paper.js + paperjs-offset
 * Works correctly with complex font paths
 */

// Paper.js will be loaded dynamically to avoid SSR issues
let paper: any = null;
let PaperOffset: any = null;

/**
 * Initialize Paper.js and PaperOffset (client-side only)
 */
export async function initPaper(): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('Paper.js can only be used in browser');
  }
  
  if (!paper) {
    const paperModule = await import('paper');
    paper = paperModule.default || paperModule;
    
    // Create a virtual canvas for Paper.js
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 2000;
    paper.setup(canvas);
    
    // Load paperjs-offset
    const offsetModule = await import('paperjs-offset');
    PaperOffset = offsetModule.PaperOffset || offsetModule.default || offsetModule;
  }
  
  return paper;
}

/**
 * Union multiple SVG path strings into one solid shape
 */
export async function unionSvgPaths(pathStrings: string[]): Promise<string> {
  const p = await initPaper();
  
  if (pathStrings.length === 0) return '';
  if (pathStrings.length === 1) return pathStrings[0];
  
  // Import all paths
  const paths: any[] = [];
  for (const pathStr of pathStrings) {
    if (!pathStr || pathStr.trim().length < 5) continue;
    
    try {
      const path = new p.CompoundPath(pathStr);
      path.fillRule = 'nonzero';
      
      // Simplify individual paths before union for better performance
      if (path.simplify) {
        path.simplify(0.3);
      }
      
      if (path.children && path.children.length > 0) {
        paths.push(path);
      } else if (path.segments && path.segments.length > 0) {
        paths.push(path);
      }
    } catch (e) {
      console.warn('Failed to parse path:', pathStr.substring(0, 50), e);
    }
  }
  
  if (paths.length === 0) return '';
  if (paths.length === 1) {
    const result = paths[0].pathData;
    paths[0].remove();
    return result;
  }
  
  // Union all paths together
  let result = paths[0];
  for (let i = 1; i < paths.length; i++) {
    try {
      const united = result.unite(paths[i]);
      result.remove();
      paths[i].remove();
      result = united;
    } catch (e) {
      console.warn('Union failed for path', i, e);
      paths[i].remove();
    }
  }
  
  // Final simplify to reduce complexity
  if (result.simplify) {
    result.simplify(0.4);
  }
  
  const pathData = result.pathData;
  result.remove();
  
  return pathData || '';
}

/**
 * Union paths and then apply offset - single operation for clean result
 */
export async function unionAndOffsetPaths(pathStrings: string[], offsetMm: number): Promise<string> {
  const p = await initPaper();
  
  if (pathStrings.length === 0) return '';
  
  // First union all paths
  const unionResult = await unionSvgPaths(pathStrings);
  
  if (!unionResult) return '';
  
  // Then apply offset to the union
  const offsetResult = await createOffsetOutline(unionResult, offsetMm, true);
  
  return offsetResult;
}

/**
 * Offset a path outward (positive) or inward (negative)
 * Returns the offset path as SVG path string
 */
export async function offsetSvgPath(pathString: string, offsetMm: number): Promise<string> {
  const p = await initPaper();
  
  if (!pathString || offsetMm === 0) return pathString;
  
  try {
    const path = new p.CompoundPath(pathString);
    
    // Use PaperOffset if available, otherwise use stroke expansion
    // Paper.js doesn't have native offset, so we use stroke + unite trick
    const strokePath = new p.CompoundPath(pathString);
    strokePath.strokeWidth = Math.abs(offsetMm) * 2;
    strokePath.strokeJoin = 'round';
    strokePath.strokeCap = 'round';
    
    // Expand stroke to filled shape
    const expanded = expandStroke(p, strokePath, offsetMm);
    
    let result: string;
    if (offsetMm > 0) {
      // Outward offset: union original with expanded stroke
      const united = path.unite(expanded);
      result = united.pathData || '';
      united.remove();
    } else {
      // Inward offset: subtract expanded from original
      const subtracted = path.subtract(expanded);
      result = subtracted.pathData || '';
      subtracted.remove();
    }
    
    path.remove();
    strokePath.remove();
    expanded.remove();
    
    return result;
  } catch (e) {
    console.error('Offset failed:', e);
    return pathString;
  }
}

/**
 * Expand stroke to filled path (workaround for Paper.js lack of native offset)
 */
function expandStroke(p: any, path: any, offset: number): any {
  // Create offset by tracing the outline
  const offsetPath = new p.Path();
  
  // Get all curves from the path
  const curves = path.curves || (path.children ? path.children.flatMap((c: any) => c.curves || []) : []);
  
  if (curves.length === 0) {
    return new p.Path();
  }
  
  // Sample points along the path and create offset contour
  const points: any[] = [];
  const step = 0.5; // mm between sample points
  
  for (const curve of curves) {
    const length = curve.length;
    const steps = Math.max(4, Math.ceil(length / step));
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = curve.getPointAtTime(t);
      const normal = curve.getNormalAtTime(t);
      
      if (point && normal) {
        points.push(point.add(normal.multiply(Math.abs(offset))));
      }
    }
  }
  
  if (points.length > 2) {
    offsetPath.addSegments(points);
    offsetPath.closePath();
    offsetPath.smooth({ type: 'continuous' });
  }
  
  return offsetPath;
}

/**
 * Create proper offset path using paperjs-offset library
 * This creates a smooth outline that follows the path silhouette exactly
 */
export async function createOffsetOutline(pathString: string, offsetMm: number, smooth = true): Promise<string> {
  const p = await initPaper();
  
  if (!pathString) return '';
  
  try {
    // Parse the original path
    const originalPath = new p.CompoundPath(pathString);
    
    // Simplify before offset for better performance
    if (originalPath.simplify) {
      originalPath.simplify(0.2);
    }
    
    // Use PaperOffset for proper offset
    if (PaperOffset && PaperOffset.offset) {
      const offsetResult = PaperOffset.offset(originalPath, offsetMm, {
        join: 'round',
        cap: 'round',
        limit: 10
      });
      
      if (offsetResult) {
        // Simplify offset result
        if (offsetResult.simplify) {
          offsetResult.simplify(0.3);
        }
        
        // Apply light smoothing to reduce corners
        if (smooth) {
          if (offsetResult.children) {
            for (const child of offsetResult.children) {
              child.smooth({ type: 'continuous', factor: 0.3 });
            }
          } else {
            offsetResult.smooth({ type: 'continuous', factor: 0.3 });
          }
        }
        
        const result = offsetResult.pathData || '';
        offsetResult.remove();
        originalPath.remove();
        return result;
      }
    }
    
    // Fallback: use offsetStroke if offset doesn't work
    if (PaperOffset && PaperOffset.offsetStroke) {
      const strokeResult = PaperOffset.offsetStroke(originalPath, offsetMm, {
        join: 'round',
        cap: 'round'
      });
      
      if (strokeResult) {
        if (strokeResult.simplify) {
          strokeResult.simplify(0.3);
        }
        if (smooth) {
          strokeResult.smooth({ type: 'continuous', factor: 0.3 });
        }
        const result = strokeResult.pathData || '';
        strokeResult.remove();
        originalPath.remove();
        return result;
      }
    }
    
    // Last fallback: bounding box with rounded corners
    const bounds = originalPath.bounds;
    const expanded = new p.Path.Rectangle({
      x: bounds.x - offsetMm,
      y: bounds.y - offsetMm,
      width: bounds.width + offsetMm * 2,
      height: bounds.height + offsetMm * 2,
      radius: offsetMm
    });
    const result = expanded.pathData || '';
    expanded.remove();
    originalPath.remove();
    return result;
  } catch (e) {
    console.error('Offset outline failed:', e);
    return pathString;
  }
}

/**
 * Simple offset using paperjs-offset
 */
export async function simpleOffsetPath(pathString: string, offsetMm: number): Promise<string> {
  return createOffsetOutline(pathString, offsetMm);
}

/**
 * Create rounded rectangle path
 */
export async function createRoundedRect(
  x: number, y: number, 
  width: number, height: number, 
  radius: number
): Promise<string> {
  const p = await initPaper();
  
  const rect = new p.Path.Rectangle({
    x, y, width, height,
    radius: Math.min(radius, width / 2, height / 2)
  });
  
  const pathData = rect.pathData;
  rect.remove();
  
  return pathData || '';
}

/**
 * Create circle path
 */
export async function createCircle(cx: number, cy: number, r: number): Promise<string> {
  const p = await initPaper();
  
  const circle = new p.Path.Circle({
    center: [cx, cy],
    radius: r
  });
  
  const pathData = circle.pathData;
  circle.remove();
  
  return pathData || '';
}

/**
 * Subtract one path from another (for holes)
 */
export async function subtractPaths(basePath: string, holePath: string): Promise<string> {
  const p = await initPaper();
  
  if (!basePath) return '';
  if (!holePath) return basePath;
  
  try {
    const base = new p.CompoundPath(basePath);
    const hole = new p.CompoundPath(holePath);
    
    const result = base.subtract(hole);
    const pathData = result.pathData || '';
    
    base.remove();
    hole.remove();
    result.remove();
    
    return pathData;
  } catch (e) {
    console.error('Subtract failed:', e);
    return basePath;
  }
}

/**
 * Get bounding box of a path
 */
export async function getPathBounds(pathString: string): Promise<{ x: number; y: number; width: number; height: number }> {
  const p = await initPaper();
  
  if (!pathString) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  
  try {
    const path = new p.CompoundPath(pathString);
    const bounds = path.bounds;
    path.remove();
    
    return {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height
    };
  } catch (e) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
}

/**
 * Translate a path by dx, dy
 */
export async function translateSvgPath(pathString: string, dx: number, dy: number): Promise<string> {
  const p = await initPaper();
  
  if (!pathString || (dx === 0 && dy === 0)) return pathString;
  
  try {
    const path = new p.CompoundPath(pathString);
    path.translate(new p.Point(dx, dy));
    const result = path.pathData || '';
    path.remove();
    return result;
  } catch (e) {
    return pathString;
  }
}

/**
 * Scale a path
 */
export async function scaleSvgPath(pathString: string, scale: number, cx = 0, cy = 0): Promise<string> {
  const p = await initPaper();
  
  if (!pathString || scale === 1) return pathString;
  
  try {
    const path = new p.CompoundPath(pathString);
    path.scale(scale, new p.Point(cx, cy));
    const result = path.pathData || '';
    path.remove();
    return result;
  } catch (e) {
    return pathString;
  }
}
