/**
 * Centered Finger Segments - LightBurn-style finger distribution
 * 
 * Provides perfect alignment across panels with:
 * - K full-width fingers centered
 * - Adaptive edge fingers that mold to remaining length
 */

export interface FingerSegments {
  lengths: number[];  // Segment lengths in order
  totalLength: number;
  K: number;  // Number of core fingers
  fingerWidth: number;
}

export interface SegmentResult {
  segments: FingerSegments;
  effectiveK: number;       // K after auto-adjust
  edgeLen: number;          // left/right segment length
  ok: boolean;
  warning?: string;
}

export interface CenteredFingerConfig {
  K_W: number;  // Core fingers for width edges (default 3)
  K_D: number;  // Core fingers for depth edges (default 2)  
  K_H: number;  // Core fingers for height edges (default 2)
  minEdgeFinger: number;  // Minimum edge finger width (default fw/2 or 3mm)
}

/**
 * Compute centered finger segments for given length and configuration
 * Returns segments with warnings if K was adjusted
 */
export function computeCenteredSegments(
  length: number,
  fingerWidth: number,
  K: number,
  minEdgeFinger: number
): SegmentResult {
  // Clamp K >= 0
  let effectiveK = Math.max(0, Math.floor(K));
  let warning: string | undefined;
  
  // Calculate core length and remaining
  let coreLen = effectiveK * fingerWidth;
  let remaining = length - coreLen;
  
  // Check if we have enough space for edge fingers
  if (remaining < 2 * minEdgeFinger) {
    // Reduce K until we have enough space
    const originalK = effectiveK;
    while (effectiveK > 0 && remaining < 2 * minEdgeFinger) {
      effectiveK--;
      coreLen = effectiveK * fingerWidth;
      remaining = length - coreLen;
    }
    
    if (effectiveK !== originalK) {
      warning = `Core fingers reduced from ${originalK} to ${effectiveK} due to small edge length`;
    }
    
    // If still not enough space at K=0, use fallback
    if (remaining < 2 * minEdgeFinger) {
      // Fallback to equal segmentation
      const fallbackCount = Math.max(2, Math.round(length / fingerWidth));
      const segmentLength = length / fallbackCount;
      
      return {
        segments: {
          lengths: Array(fallbackCount).fill(segmentLength),
          totalLength: length,
          K: 0,
          fingerWidth
        },
        effectiveK: 0,
        edgeLen: segmentLength,
        ok: false,
        warning: `Fallback segmentation used (edge ${length.toFixed(1)}mm too small for minEdge ${minEdgeFinger.toFixed(1)}mm)`
      };
    }
  }
  
  // Calculate edge segment width
  const edgeLen = remaining / 2;
  
  // Build segments array: [edgeLen, fw, fw, ..., fw, edgeLen]
  const segments: number[] = [edgeLen];
  for (let i = 0; i < effectiveK; i++) {
    segments.push(fingerWidth);
  }
  segments.push(edgeLen);
  
  return {
    segments: {
      lengths: segments,
      totalLength: length,
      K: effectiveK,
      fingerWidth
    },
    effectiveK,
    edgeLen,
    ok: true,
    warning
  };
}

/**
 * Generate edge geometry from explicit segments
 */
export function generateEdgeFromSegments(
  segments: FingerSegments,
  thickness: number,
  isOut: boolean,
  startWithTab: boolean = true
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  let currentX = 0;
  
  for (let i = 0; i < segments.lengths.length; i++) {
    const segmentLength = segments.lengths[i];
    const isTab = (i % 2 === 0) === startWithTab;
    
    if (isTab) {
      // Tab: create rectangular protrusion
      const startX = currentX;
      const endX = currentX + segmentLength;
      const y = isOut ? thickness : -thickness;
      
      // Up from baseline
      points.push({ x: startX, y: 0 });
      points.push({ x: startX, y: y });
      
      // Across tab
      points.push({ x: endX, y: y });
      
      // Down to baseline
      points.push({ x: endX, y: 0 });
      
      currentX = endX;
    } else {
      // Gap: move horizontally along baseline
      currentX += segmentLength;
      points.push({ x: currentX, y: 0 });
    }
  }
  
  // Remove any consecutive duplicate points
  const filteredPoints = points.filter((point, index) => {
    if (index === 0) return true;
    const prev = points[index - 1];
    return Math.abs(point.x - prev.x) > 0.001 || Math.abs(point.y - prev.y) > 0.001;
  });
  
  // Ensure final point matches target length
  const targetLength = segments.totalLength;
  const lastPoint = filteredPoints[filteredPoints.length - 1];
  if (Math.abs(lastPoint.x - targetLength) > 0.001) {
    filteredPoints.push({ x: targetLength, y: 0 });
  }
  
  return filteredPoints;
}

/**
 * Compute canonical segments for all length classes
 * Returns segment results with warnings for each length class
 */
export function computeCanonicalSegments(
  lengths: { W: number; D: number; H: number },
  fingerWidth: number,
  config: CenteredFingerConfig
): {
  SEG_W: SegmentResult;
  SEG_D: SegmentResult;
  SEG_H: SegmentResult;
  warnings: string[];
} {
  const minEdgeWidth = Math.max(config.minEdgeFinger, fingerWidth / 2);
  
  const SEG_W = computeCenteredSegments(lengths.W, fingerWidth, config.K_W, minEdgeWidth);
  const SEG_D = computeCenteredSegments(lengths.D, fingerWidth, config.K_D, minEdgeWidth);
  const SEG_H = computeCenteredSegments(lengths.H, fingerWidth, config.K_H, minEdgeWidth);
  
  const warnings: string[] = [];
  if (SEG_W.warning) warnings.push(`Width edges: ${SEG_W.warning}`);
  if (SEG_D.warning) warnings.push(`Depth edges: ${SEG_D.warning}`);
  if (SEG_H.warning) warnings.push(`Height edges: ${SEG_H.warning}`);
  
  return { SEG_W, SEG_D, SEG_H, warnings };
}

/**
 * Validate that two segments arrays are compatible for mating
 */
export function validateSegmentsCompatibility(
  a: FingerSegments,
  b: FingerSegments,
  pairName: string,
  tolerance: number = 0.001
): void {
  // Check total length compatibility
  if (Math.abs(a.totalLength - b.totalLength) > tolerance) {
    return; // Different lengths are allowed
  }
  
  // Same length requires identical segments
  if (a.lengths.length !== b.lengths.length) {
    throw new Error(
      `Segment count mismatch for ${pairName} (same length ${a.totalLength.toFixed(1)}mm):\n` +
      `  Edge A: ${a.lengths.length} segments\n` +
      `  Edge B: ${b.lengths.length} segments`
    );
  }
  
  for (let i = 0; i < a.lengths.length; i++) {
    if (Math.abs(a.lengths[i] - b.lengths[i]) > tolerance) {
      throw new Error(
        `Segment length mismatch for ${pairName} at segment ${i}:\n` +
        `  Edge A: [${a.lengths.map(l => l.toFixed(3)).join(', ')}]\n` +
        `  Edge B: [${b.lengths.map(l => l.toFixed(3)).join(', ')}]`
      );
    }
  }
}

/**
 * Reverse segments for edges traversed in opposite direction
 */
export function reverseSegments(segments: FingerSegments): FingerSegments {
  return {
    ...segments,
    lengths: [...segments.lengths].reverse()
  };
}
