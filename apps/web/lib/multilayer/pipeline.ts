/**
 * MultiLayer Maker V3 - Main Processing Pipeline
 * 
 * Converts source image into clean multilayer vector files.
 * All processing is client-side for performance and privacy.
 */

import type { SourceImage, LayerMask, VectorLayer, ProjectSettings } from './types';
import { quantizeImage } from './quantize';
import { cleanupMask, removeIslandsAsync, smoothEdgesAsync } from './cleanup';
import { vectorizeMask } from './vectorize';
import { simplifyPath } from './simplify';
import { detectIslands, generateBridges, addBridgesToSVG } from './bridges';

export interface PipelineProgress {
  stage: string;
  progress: number;
  message: string;
}

function resizeImageDataToMax(imageData: ImageData, maxDim: number): ImageData {
  const { width, height } = imageData;
  const largest = Math.max(width, height);
  if (largest <= maxDim) return imageData;

  const scale = maxDim / largest;
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = width;
  srcCanvas.height = height;
  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
  if (!srcCtx) return imageData;
  srcCtx.putImageData(imageData, 0, 0);

  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = w;
  dstCanvas.height = h;
  const dstCtx = dstCanvas.getContext('2d', { willReadFrequently: true });
  if (!dstCtx) return imageData;
  dstCtx.imageSmoothingEnabled = true;
  dstCtx.imageSmoothingQuality = 'high';
  dstCtx.drawImage(srcCanvas, 0, 0, w, h);
  return dstCtx.getImageData(0, 0, w, h);
}

export async function processImageToLayers(
  sourceImage: SourceImage,
  settings: ProjectSettings,
  onProgress?: (progress: PipelineProgress) => void
): Promise<{ masks: LayerMask[]; vectors: VectorLayer[] }> {
  
  // Stage 1: Load and preprocess
  onProgress?.({ stage: 'load', progress: 10, message: 'Loading image...' });
  const imageData = await loadImageData(sourceImage);
  const working = resizeImageDataToMax(imageData, 1200);
  const workingWidth = working.width;
  const workingHeight = working.height;
  
  // Stage 2: Background removal (optional)
  onProgress?.({ stage: 'background', progress: 20, message: 'Processing background...' });
  const processedImage = settings.removeBg 
    ? await removeBackground(working, settings.bgTolerance, settings.bgSoftness)
    : working;
  
  // Stage 3: Convert to grayscale
  onProgress?.({ stage: 'grayscale', progress: 30, message: 'Converting to grayscale...' });
  const grayscale = toGrayscale(processedImage);
  
  // Stage 4: Quantize into layers
  onProgress?.({ stage: 'quantize', progress: 40, message: `Quantizing into ${settings.layerCount} layers...` });
  const masks = await quantizeImage(grayscale, settings.layerCount, settings.quantizeMethod);
  
  // Stage 5: Cleanup masks
  onProgress?.({ stage: 'cleanup', progress: 50, message: 'Cleaning up layers...' });
  const cleanedMasks: LayerMask[] = [];
  for (let i = 0; i < masks.length; i++) {
    let mask = masks[i];
    
    // Remove small islands
    if (settings.minIslandArea > 0) {
      mask = await removeIslandsAsync(mask, settings.minIslandArea, settings.targetWidthMm);
    }
    
    // Smooth edges
    if (settings.smoothEdges > 0) {
      mask = await smoothEdgesAsync(mask, settings.smoothEdges);
    }
    
    cleanedMasks.push({
      id: `mask-${i}`,
      name: `Layer ${i + 1}`,
      order: i,
      visible: true,
      imageData: mask,
      threshold: (i / settings.layerCount) * 255,
      color: getLayerColor(i, settings.layerCount),
    });
    
    onProgress?.({ 
      stage: 'cleanup', 
      progress: 50 + (i / masks.length) * 20, 
      message: `Cleaning layer ${i + 1}/${masks.length}...` 
    });

    // Cooperative yield to keep UI responsive
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  
  // Stage 6: Vectorize
  onProgress?.({ stage: 'vectorize', progress: 70, message: 'Vectorizing layers...' });
  const vectors: VectorLayer[] = [];
  for (let i = 0; i < cleanedMasks.length; i++) {
    const mask = cleanedMasks[i];
    
    // Extract contours and convert to SVG paths
    const paths = await vectorizeMask(mask.imageData);
    
    // Simplify paths
    const simplifiedPaths = paths.map(path => 
      simplifyPath(path, settings.simplifyTolerance)
    );
    
    // Build SVG content
    const svgPath = simplifiedPaths.join(' ');
    const svgContent = buildLayerSVG(
      svgPath,
      workingWidth,
      workingHeight,
      settings.targetWidthMm,
      settings.outputFormat,
      mask.name
    );
    
    // Calculate stats
    const stats = calculateLayerStats(simplifiedPaths, workingWidth, workingHeight);
    
    vectors.push({
      id: mask.id,
      name: mask.name,
      order: mask.order,
      visible: mask.visible,
      svgPath,
      svgContent,
      color: mask.color,
      threshold: mask.threshold,
      stats,
    });
    
    onProgress?.({ 
      stage: 'vectorize', 
      progress: 70 + (i / cleanedMasks.length) * 25, 
      message: `Vectorizing layer ${i + 1}/${cleanedMasks.length}...` 
    });
  }
  
  onProgress?.({ stage: 'complete', progress: 100, message: 'Processing complete!' });
  
  return { masks: cleanedMasks, vectors };
}

async function loadImageData(source: SourceImage): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = source.dataUrl;
  });
}

function toGrayscale(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;
  const gray = new ImageData(width, height);
  
  for (let i = 0; i < data.length; i += 4) {
    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray.data[i] = gray.data[i + 1] = gray.data[i + 2] = luminance;
    gray.data[i + 3] = data[i + 3]; // Preserve alpha
  }
  
  return gray;
}

async function removeBackground(
  imageData: ImageData,
  tolerance: number,
  softness: number
): Promise<ImageData> {
  const { width, height, data } = imageData;
  const result = new ImageData(width, height);
  result.data.set(data);
  
  // Simple background removal: detect near-white pixels
  const threshold = 255 - tolerance;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Check if pixel is near white
    if (r > threshold && g > threshold && b > threshold) {
      // Make transparent with softness
      const distance = Math.min(r, g, b) - threshold;
      const alpha = Math.max(0, 255 - (distance * softness));
      result.data[i + 3] = alpha;
    }
  }
  
  return result;
}

function buildLayerSVG(
  pathData: string,
  imageWidth: number,
  imageHeight: number,
  targetWidthMm: number,
  format: 'filled' | 'stroked',
  layerName: string
): string {
  const aspectRatio = imageWidth / imageHeight;
  const heightMm = targetWidthMm / aspectRatio;
  
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${targetWidthMm}mm" height="${heightMm}mm" viewBox="0 0 ${imageWidth} ${imageHeight}" xmlns="http://www.w3.org/2000/svg">
  <title>${layerName}</title>
  <g id="${layerName}">
    <path d="${pathData}" ${format === 'filled' 
      ? 'fill="black" fill-rule="evenodd"' 
      : 'fill="none" stroke="black" stroke-width="0.1"'} />
  </g>
</svg>`;
  
  return svg;
}

function calculateLayerStats(
  paths: string[],
  imageWidth: number,
  imageHeight: number
): VectorLayer['stats'] {
  let openPaths = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  paths.forEach(path => {
    // Check if path is closed (ends with Z)
    if (!path.trim().endsWith('Z') && !path.trim().endsWith('z')) {
      openPaths++;
    }
    
    // Extract coordinates for bounding box (simplified)
    const coords = path.match(/[\d.]+/g)?.map(Number) || [];
    for (let i = 0; i < coords.length; i += 2) {
      const x = coords[i];
      const y = coords[i + 1];
      if (x !== undefined && y !== undefined) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  });
  
  return {
    pathCount: paths.length,
    openPaths,
    islandCount: paths.length, // Simplified: each path is an island
    boundingBox: {
      x: minX === Infinity ? 0 : minX,
      y: minY === Infinity ? 0 : minY,
      width: maxX === -Infinity ? imageWidth : maxX - minX,
      height: maxY === -Infinity ? imageHeight : maxY - minY,
    },
  };
}

function getLayerColor(index: number, total: number): string {
  const hue = (index / total) * 360;
  return `hsl(${hue}, 70%, 50%)`;
}
