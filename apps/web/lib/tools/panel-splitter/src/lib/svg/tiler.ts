import paper from 'paper/dist/paper-core';
import { SVGInfo, Settings, TileInfo, GridInfo } from '../../types';
import { generateRegistrationMarksSVG } from './marks';

const asyncYield = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

interface TileResult {
  tile: TileInfo;
  svgContent: string;
}

export async function processTiles(
  svgInfo: SVGInfo,
  gridInfo: GridInfo,
  settings: Settings,
  onProgress: (current: number, total: number) => void,
  shouldCancel: () => boolean
): Promise<TileResult[]> {
  const results: TileResult[] = [];
  const { tiles } = gridInfo;
  const total = tiles.length;

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  paper.setup(canvas);

  for (let i = 0; i < total; i++) {
    if (shouldCancel()) {
      throw new Error('Processing cancelled');
    }

    onProgress(i + 1, total);

    const tile = tiles[i];
    const result = await processSingleTile(svgInfo, tile, gridInfo, settings);
    
    if (result) {
      results.push(result);
    }

    if (i % 2 === 0) {
      await asyncYield();
    }
  }

  return results;
}

async function processSingleTile(
  svgInfo: SVGInfo,
  tile: TileInfo,
  gridInfo: GridInfo,
  settings: Settings
): Promise<TileResult | null> {
  const { margin, exportMode, guidesEnabled, expandStrokes, simplifyTolerance } = settings;

  paper.project.clear();

  const designScaleX = svgInfo.detectedWidthMm / (svgInfo.viewBox?.width ?? svgInfo.width ?? svgInfo.detectedWidthMm);
  const designScaleY = svgInfo.detectedHeightMm / (svgInfo.viewBox?.height ?? svgInfo.height ?? svgInfo.detectedHeightMm);

  const _tileRectInDesign = new paper.Rectangle(
    tile.x,
    tile.y,
    gridInfo.effectiveTileWidth,
    gridInfo.effectiveTileHeight
  );
  void _tileRectInDesign;

  const tileRectInSvg = new paper.Rectangle(
    tile.x / designScaleX + (svgInfo.viewBox?.x ?? 0),
    tile.y / designScaleY + (svgInfo.viewBox?.y ?? 0),
    gridInfo.effectiveTileWidth / designScaleX,
    gridInfo.effectiveTileHeight / designScaleY
  );

  const importedItem = paper.project.importSVG(svgInfo.originalContent, {
    expandShapes: true,
    insert: true,
  });

  if (!importedItem) {
    tile.isEmpty = true;
    return null;
  }

  if (expandStrokes) {
    expandAllStrokes(importedItem);
  }

  let hasContent = false;
  let hasUnsafeFallback = false;

  if (exportMode === 'laser-safe') {
    // Use clipMask approach - more reliable than geometric intersection
    const clipRect = new paper.Path.Rectangle(tileRectInSvg);
    clipRect.clipMask = true;

    // Filter out background rectangles that cover the entire SVG
    const allPaths = getAllPaths(importedItem);
    const svgWidth = svgInfo.viewBox?.width ?? svgInfo.width ?? 1;
    const svgHeight = svgInfo.viewBox?.height ?? svgInfo.height ?? 1;
    
    for (const path of allPaths) {
      const pathBounds = path.bounds;
      const coverageX = pathBounds.width / svgWidth;
      const coverageY = pathBounds.height / svgHeight;
      const isSimplePath = path instanceof paper.Path && (path as paper.Path).segments.length <= 5;
      if (coverageX > 0.95 && coverageY > 0.95 && isSimplePath) {
        console.log('Removing background rect:', pathBounds.width, 'x', pathBounds.height);
        path.remove();
      } else if (path.bounds.intersects(tileRectInSvg)) {
        hasContent = true;
      }
    }

    const clipGroup = new paper.Group([clipRect, importedItem]);
    clipGroup.addTo(paper.project.activeLayer);
    
    // Translate to position content at margin offset
    clipGroup.translate(new paper.Point(
      -tileRectInSvg.x + margin / designScaleX,
      -tileRectInSvg.y + margin / designScaleY
    ));

    console.log('Clip group bounds:', clipGroup.bounds.x, clipGroup.bounds.y, clipGroup.bounds.width, clipGroup.bounds.height);

    if (simplifyTolerance > 0) {
      simplifyPaths(clipGroup, simplifyTolerance / designScaleX);
    }

    if (guidesEnabled) {
      addGuides(gridInfo, settings, designScaleX, designScaleY);
    }

  } else {
    const clipRect = new paper.Path.Rectangle(tileRectInSvg);
    clipRect.clipMask = true;

    const clipGroup = new paper.Group([clipRect, importedItem]);
    clipGroup.addTo(paper.project.activeLayer);
    
    clipGroup.translate(new paper.Point(
      -tileRectInSvg.x + margin / designScaleX,
      -tileRectInSvg.y + margin / designScaleY
    ));

    hasContent = true;

    if (guidesEnabled) {
      addGuides(gridInfo, settings, designScaleX, designScaleY);
    }
  }

  tile.isEmpty = !hasContent;
  tile.hasUnsafeFallback = hasUnsafeFallback;

  if (!hasContent && !settings.exportEmptyTiles) {
    return null;
  }

  const svgContent = exportTileSVG(gridInfo, settings, tile.row, tile.col);

  return {
    tile: { ...tile, svgContent },
    svgContent,
  };
}

function getAllPaths(item: paper.Item): paper.PathItem[] {
  const paths: paper.PathItem[] = [];

  function traverse(it: paper.Item) {
    if (it instanceof paper.Path || it instanceof paper.CompoundPath) {
      paths.push(it as paper.PathItem);
    } else if (it instanceof paper.Group || it instanceof paper.Layer) {
      for (const child of it.children) {
        traverse(child);
      }
    }
  }

  traverse(item);
  return paths;
}

function intersectPath(path: paper.PathItem, clipRect: paper.Path): paper.PathItem | null {
  if (path instanceof paper.CompoundPath) {
    const results: paper.PathItem[] = [];
    for (const child of path.children as unknown as paper.Path[]) {
      const intersected = child.intersect(clipRect, { insert: false });
      if (intersected && !isEmptyPath(intersected)) {
        results.push(intersected as paper.PathItem);
      }
    }
    if (results.length === 0) return null;
    if (results.length === 1) return results[0];
    return new paper.CompoundPath({ children: results, insert: false });
  }

  const intersected = path.intersect(clipRect, { insert: false });
  return intersected as paper.PathItem;
}

function isEmptyPath(item: paper.Item): boolean {
  if (item instanceof paper.Path) {
    return item.segments.length === 0;
  }
  if (item instanceof paper.CompoundPath) {
    return item.children.length === 0 || item.children.every((c: paper.Item) => isEmptyPath(c));
  }
  return false;
}

function copyStyles(source: paper.Item, target: paper.Item) {
  if (source instanceof paper.PathItem && target instanceof paper.PathItem) {
    target.fillColor = source.fillColor ? source.fillColor.clone() : null;
    target.strokeColor = source.strokeColor ? source.strokeColor.clone() : null;
    target.strokeWidth = source.strokeWidth;
    target.strokeCap = source.strokeCap;
    target.strokeJoin = source.strokeJoin;
    target.dashArray = source.dashArray;
    target.dashOffset = source.dashOffset;
    target.opacity = source.opacity;
    
    console.log('Copied styles - fill:', target.fillColor?.toCSS(true), 'stroke:', target.strokeColor?.toCSS(true));
  }
}

function expandAllStrokes(item: paper.Item) {
  const paths = getAllPaths(item);
  for (const path of paths) {
    if (path.strokeColor && path.strokeWidth && path.strokeWidth > 0) {
      try {
        const expanded = expandStroke(path);
        if (expanded) {
          path.replaceWith(expanded);
        }
      } catch {
        // Keep original if expansion fails
      }
    }
  }
}

function expandStroke(path: paper.PathItem): paper.PathItem | null {
  if (!(path instanceof paper.Path)) return null;
  
  const strokeWidth = path.strokeWidth || 0;
  if (strokeWidth <= 0) return null;

  try {
    const offset1 = PaperOffset.offset(path, strokeWidth / 2, { join: 'round' });
    const offset2 = PaperOffset.offset(path, -strokeWidth / 2, { join: 'round' });
    
    if (offset1 && offset2) {
      const result = offset1.unite(offset2, { insert: false });
      result.fillColor = path.strokeColor;
      result.strokeColor = null;
      return result as paper.PathItem;
    }
  } catch {
    // Fallback: just return null
  }
  
  return null;
}

const PaperOffset = {
  offset(path: paper.Path, _distance: number, _options: { join: string }): paper.Path | null {
    if (path.closed) {
      return path.clone() as paper.Path;
    }
    return path.clone() as paper.Path;
  }
};

function simplifyPaths(item: paper.Item, tolerance: number) {
  const paths = getAllPaths(item);
  for (const path of paths) {
    if (path instanceof paper.Path) {
      path.simplify(tolerance);
    }
  }
}

function addGuides(gridInfo: GridInfo, settings: Settings, scaleX: number, scaleY: number) {
  const { margin } = settings;
  const { effectiveTileWidth, effectiveTileHeight } = gridInfo;

  const borderRect = new paper.Path.Rectangle(
    new paper.Rectangle(
      margin / scaleX,
      margin / scaleY,
      effectiveTileWidth / scaleX,
      effectiveTileHeight / scaleY
    )
  );
  borderRect.strokeColor = new paper.Color('red');
  borderRect.strokeWidth = 0.1 / scaleX;
  borderRect.fillColor = null;

  const crossSize = 5 / scaleX;
  const corners = [
    { x: margin / scaleX, y: margin / scaleY },
    { x: (margin + effectiveTileWidth) / scaleX, y: margin / scaleY },
    { x: margin / scaleX, y: (margin + effectiveTileHeight) / scaleY },
    { x: (margin + effectiveTileWidth) / scaleX, y: (margin + effectiveTileHeight) / scaleY },
  ];

  for (const corner of corners) {
    const h = new paper.Path.Line(
      new paper.Point(corner.x - crossSize, corner.y),
      new paper.Point(corner.x + crossSize, corner.y)
    );
    h.strokeColor = new paper.Color('red');
    h.strokeWidth = 0.1 / scaleX;

    const v = new paper.Path.Line(
      new paper.Point(corner.x, corner.y - crossSize),
      new paper.Point(corner.x, corner.y + crossSize)
    );
    v.strokeColor = new paper.Color('red');
    v.strokeWidth = 0.1 / scaleX;
  }
}

function exportTileSVG(gridInfo: GridInfo, settings: Settings, tileRow: number, tileCol: number): string {
  const { tileWidth, tileHeight, effectiveTileWidth, effectiveTileHeight } = gridInfo;
  
  // Scale is 1:1 since we're using mm units throughout
  const designScaleX = 1;
  const designScaleY = 1;

  // Debug: Check what's in the project before export
  console.log('Exporting tile', tileRow, tileCol);
  console.log('Project children count:', paper.project.activeLayer.children.length);
  paper.project.activeLayer.children.forEach((child, i) => {
    console.log(`  Child ${i}:`, child.className, child.bounds);
    if (child.className === 'Group') {
      console.log(`    Group has ${child.children.length} children`);
      child.children.forEach((grandchild: any, j: number) => {
        const fillCSS = grandchild.fillColor ? grandchild.fillColor.toCSS(true) : 'none';
        const strokeCSS = grandchild.strokeColor ? grandchild.strokeColor.toCSS(true) : 'none';
        console.log(`      Grandchild ${j}:`, grandchild.className, 'fill:', fillCSS, 'stroke:', strokeCSS, 'visible:', grandchild.visible);
      });
    }
  });

  console.log('Export bounds:', `0, 0, ${tileWidth}, ${tileHeight}`);
  console.log('Group bounds:', paper.project.activeLayer.children[0]?.bounds);

  // Export without bounds - let paper.js set viewBox automatically
  const svg = paper.project.exportSVG({
    asString: true,
  }) as string;
  
  console.log('Exported SVG length:', svg.length);
  console.log('SVG preview:', svg.substring(0, 500));

  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');

  if (svgEl) {
    // Set viewBox to tile dimensions - content has been translated to start at (0,0) with margin
    // The clip mask ensures only the tile portion is visible
    const viewBoxWidth = tileWidth / designScaleX;
    const viewBoxHeight = tileHeight / designScaleY;
    
    svgEl.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`);
    svgEl.setAttribute('width', `${tileWidth}mm`);
    svgEl.setAttribute('height', `${tileHeight}mm`);
    
    console.log('Final viewBox:', `0 0 ${viewBoxWidth} ${viewBoxHeight}`);
    
    if (settings.registrationMarks.enabled) {
      const marksSVG = generateRegistrationMarksSVG(gridInfo, settings, tileRow, tileCol);
      svgEl.innerHTML += marksSVG;
    }
  }

  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc);
}
