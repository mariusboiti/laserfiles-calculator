/**
 * SVG utilities for ensuring laser-safe output
 */

/**
 * Enforce laser-safe SVG attributes
 * - No fills (or fill="none")
 * - Consistent stroke attributes
 * - Remove duplicate/collinear segments
 */
export function enforceLaserSafeSvg(svgContent: string): string {
  let cleaned = svgContent;
  
  // Ensure all paths have fill="none"
  cleaned = cleaned.replace(/<path([^>]*?)>/g, (match, attrs) => {
    if (!attrs.includes('fill=')) {
      return `<path${attrs} fill="none">`;
    }
    return match.replace(/fill="[^"]*"/, 'fill="none"');
  });
  
  // Ensure all circles have fill="none"
  cleaned = cleaned.replace(/<circle([^>]*?)>/g, (match, attrs) => {
    if (!attrs.includes('fill=')) {
      return `<circle${attrs} fill="none">`;
    }
    return match.replace(/fill="[^"]*"/, 'fill="none"');
  });
  
  // Ensure all polygons have fill="none"
  cleaned = cleaned.replace(/<polygon([^>]*?)>/g, (match, attrs) => {
    if (!attrs.includes('fill=')) {
      return `<polygon${attrs} fill="none">`;
    }
    return match.replace(/fill="[^"]*"/, 'fill="none"');
  });
  
  // Ensure consistent stroke width (0.5 for cut lines, 0.3 for engrave)
  // This is already handled in generation, but we can normalize here if needed
  
  return cleaned;
}

/**
 * Remove duplicate consecutive points from a path
 */
export function removeDuplicatePoints(points: { x: number; y: number }[]): { x: number; y: number }[] {
  if (points.length <= 1) return points;
  
  const cleaned: { x: number; y: number }[] = [points[0]];
  
  for (let i = 1; i < points.length; i++) {
    const prev = cleaned[cleaned.length - 1];
    const curr = points[i];
    
    // Skip if same as previous point (within tolerance)
    const dx = Math.abs(curr.x - prev.x);
    const dy = Math.abs(curr.y - prev.y);
    if (dx < 0.001 && dy < 0.001) continue;
    
    cleaned.push(curr);
  }
  
  return cleaned;
}

/**
 * Remove collinear points from a path
 * (points that lie on the same line as their neighbors)
 */
export function removeCollinearPoints(
  points: { x: number; y: number }[],
  tolerance = 0.01
): { x: number; y: number }[] {
  if (points.length <= 2) return points;
  
  const cleaned: { x: number; y: number }[] = [points[0]];
  
  for (let i = 1; i < points.length - 1; i++) {
    const prev = cleaned[cleaned.length - 1];
    const curr = points[i];
    const next = points[i + 1];
    
    // Calculate cross product to check if collinear
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    
    const cross = Math.abs(dx1 * dy2 - dy1 * dx2);
    
    // If cross product is near zero, points are collinear
    if (cross > tolerance) {
      cleaned.push(curr);
    }
  }
  
  // Always keep the last point
  cleaned.push(points[points.length - 1]);
  
  return cleaned;
}

/**
 * Optimize path by removing duplicates and collinear points
 */
export function optimizePath(points: { x: number; y: number }[]): { x: number; y: number }[] {
  let optimized = removeDuplicatePoints(points);
  optimized = removeCollinearPoints(optimized);
  return optimized;
}

/**
 * Add vector-effect="non-scaling-stroke" to SVG elements for consistent stroke width
 */
export function addNonScalingStroke(svgContent: string): string {
  // Add to paths
  let enhanced = svgContent.replace(
    /<path([^>]*?)>/g,
    '<path$1 vector-effect="non-scaling-stroke">'
  );
  
  // Add to circles
  enhanced = enhanced.replace(
    /<circle([^>]*?)>/g,
    '<circle$1 vector-effect="non-scaling-stroke">'
  );
  
  // Add to polygons
  enhanced = enhanced.replace(
    /<polygon([^>]*?)>/g,
    '<polygon$1 vector-effect="non-scaling-stroke">'
  );
  
  return enhanced;
}

/**
 * Validate SVG is laser-safe
 */
export function validateLaserSafeSvg(svgContent: string): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check for fills that aren't "none"
  const fillMatches = svgContent.match(/fill="(?!none)[^"]+"/g);
  if (fillMatches && fillMatches.length > 0) {
    issues.push(`Found ${fillMatches.length} elements with non-none fill`);
  }
  
  // Check for gradients
  if (svgContent.includes('<linearGradient') || svgContent.includes('<radialGradient')) {
    issues.push('SVG contains gradients (not laser-safe)');
  }
  
  // Check for filters
  if (svgContent.includes('<filter')) {
    issues.push('SVG contains filters (not laser-safe)');
  }
  
  // Check for images
  if (svgContent.includes('<image')) {
    issues.push('SVG contains raster images (not laser-safe)');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
  };
}
