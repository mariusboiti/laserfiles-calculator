/**
 * PathOps-based builder for Badge/Coaster geometry
 * Replaces simple path generation with robust PathKit operations
 */

import { loadPathOps, type PathOps } from '../../../geometry/pathops';

export interface BadgeBuilderConfig {
  // Text paths (already converted to SVG paths)
  textPaths: string[];
  
  // Icon paths (optional)
  iconPaths?: string[];
  
  // Sticker offset around text+icon union
  stickerOffsetMm: number;
  
  // Optional inner border
  innerBorder?: {
    enabled: boolean;
    gapMm: number;
    widthMm: number;
  };
  
  // Base shape (for round/shield badges)
  baseShape?: {
    type: 'circle' | 'shield' | 'custom';
    path?: string; // For custom shapes
    cx: number;
    cy: number;
    size: number;
  };
}

export interface BadgeBuilderResult {
  // CUT layer: outer outline with holes
  cutPath: string;
  
  // ENGRAVE layer: text + icon
  engravePath: string;
  
  // Optional: inner border (CUT or preview only)
  innerBorderPath?: string;
  
  // Bounds for SVG viewBox
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Build badge geometry using PathOps
 */
export async function buildBadgeWithPathOps(
  config: BadgeBuilderConfig
): Promise<BadgeBuilderResult> {
  const pk = await loadPathOps();
  
  // =========================================================================
  // STEP 1: Union all text paths
  // =========================================================================
  let topPath: any = null;
  
  for (const pathD of config.textPaths) {
    if (!pathD) continue;
    const path = pk.fromSVG(pathD);
    if (!topPath) {
      topPath = path;
    } else {
      topPath = pk.union(topPath, path);
    }
  }
  
  // Add icon paths
  if (config.iconPaths) {
    for (const pathD of config.iconPaths) {
      if (!pathD) continue;
      const path = pk.fromSVG(pathD);
      if (!topPath) {
        topPath = path;
      } else {
        topPath = pk.union(topPath, path);
      }
    }
  }
  
  if (!topPath) {
    // No content - return empty result
    return {
      cutPath: '',
      engravePath: '',
      bounds: { x: 0, y: 0, width: 100, height: 50 },
    };
  }
  
  // =========================================================================
  // STEP 2: Create sticker outline via stroke expansion
  // =========================================================================
  let basePath: any;
  
  if (config.baseShape) {
    // Use base shape (circle/shield) instead of sticker outline
    if (config.baseShape.type === 'circle') {
      basePath = pk.makeCircle(
        config.baseShape.cx,
        config.baseShape.cy,
        config.baseShape.size / 2
      );
    } else if (config.baseShape.path) {
      basePath = pk.fromSVG(config.baseShape.path);
    } else {
      // Fallback to sticker
      const strokeWidth = config.stickerOffsetMm * 2;
      const strokePath = pk.strokeToPath(topPath, {
        width: strokeWidth,
        join: 'round',
        cap: 'round',
      });
      basePath = pk.union(strokePath, topPath);
    }
  } else {
    // Sticker mode: offset around text+icon
    const strokeWidth = config.stickerOffsetMm * 2;
    const strokePath = pk.strokeToPath(topPath, {
      width: strokeWidth,
      join: 'round',
      cap: 'round',
    });
    basePath = pk.union(strokePath, topPath);
  }
  
  // =========================================================================
  // STEP 3: Optional inner border
  // =========================================================================
  let innerBorderPath: string | undefined;
  
  if (config.innerBorder?.enabled && config.innerBorder.gapMm > 0) {
    const innerStrokeWidth = config.stickerOffsetMm * 2 - config.innerBorder.gapMm * 2;
    if (innerStrokeWidth > 0) {
      const innerStroke = pk.strokeToPath(topPath, {
        width: innerStrokeWidth,
        join: 'round',
        cap: 'round',
      });
      const innerPath = pk.union(innerStroke, topPath);
      innerBorderPath = pk.toSVG(innerPath);
    }
  }
  
  // =========================================================================
  // STEP 4: Calculate bounds and translate to origin
  // =========================================================================
  const finalBounds = pk.getBounds(basePath);
  
  if (!finalBounds || !isFinite(finalBounds.width) || finalBounds.width <= 0) {
    console.warn('[PathOps] Invalid bounds, using fallback');
    return {
      cutPath: '',
      engravePath: '',
      bounds: { x: 0, y: 0, width: 100, height: 50 },
    };
  }
  
  const margin = 1;
  const translateX = margin - finalBounds.x;
  const translateY = margin - finalBounds.y;
  
  const translateMatrix = [1, 0, translateX, 0, 1, translateY, 0, 0, 1];
  const finalBasePath = pk.transform(basePath, translateMatrix);
  const finalTopPath = pk.transform(topPath, translateMatrix);
  
  const finalWidth = finalBounds.width + margin * 2;
  const finalHeight = finalBounds.height + margin * 2;
  
  // =========================================================================
  // STEP 5: Convert to SVG
  // =========================================================================
  const cutPath = pk.toSVG(finalBasePath);
  const engravePath = pk.toSVG(finalTopPath);
  
  return {
    cutPath,
    engravePath,
    innerBorderPath,
    bounds: {
      x: 0,
      y: 0,
      width: finalWidth,
      height: finalHeight,
    },
  };
}

/**
 * Build simple shape with border using PathOps
 * For circle/hex/octagon coasters with text engrave
 */
export async function buildShapeWithBorder(
  shapePath: string,
  borderWidthMm: number
): Promise<{ cutPath: string; bounds: { x: number; y: number; width: number; height: number } }> {
  const pk = await loadPathOps();
  
  let basePath = pk.fromSVG(shapePath);
  
  // Add border via stroke expansion
  if (borderWidthMm > 0) {
    const strokePath = pk.strokeToPath(basePath, {
      width: borderWidthMm * 2,
      join: 'round',
      cap: 'round',
    });
    basePath = pk.union(strokePath, basePath);
  }
  
  const bounds = pk.getBounds(basePath);
  const cutPath = pk.toSVG(basePath);
  
  return {
    cutPath,
    bounds: bounds || { x: 0, y: 0, width: 100, height: 50 },
  };
}
