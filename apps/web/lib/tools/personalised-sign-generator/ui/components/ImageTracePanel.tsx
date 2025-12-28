'use client';

/**
 * ImageTracePanel - Upload raster image and trace to SVG paths
 * Uses in-browser image tracing for converting bitmaps to vector paths
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Wand2,
  AlertCircle,
  Loader2,
  RotateCcw,
  Scissors,
  Pencil,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { ShapeElement, EngraveSketchElement } from '../../types/signPro';
import { generateId } from '../../types/signPro';

export type TraceMode = 'silhouette' | 'sketch';

interface ImageTracePanelProps {
  targetWidthMm: number;
  targetHeightMm: number;
  onTraceResult: (element: ShapeElement | EngraveSketchElement, targetLayer: 'CUT' | 'ENGRAVE') => void;
  disabled?: boolean;
}

interface TraceOptions {
  mode: TraceMode;
  threshold: number;
  smoothing: number;
  detail: 'low' | 'medium' | 'high';
  invert: boolean;
  removeBackground: boolean;
}

const DEFAULT_OPTIONS: TraceOptions = {
  mode: 'silhouette',
  threshold: 128,
  smoothing: 0.5,
  detail: 'low',  // Default to low for performance
  invert: false,
  removeBackground: true,
};

// Max dimensions for performance - reduced to prevent freezing
const MAX_TRACE_DIMENSIONS: Record<TraceOptions['detail'], number> = {
  low: 300,
  medium: 500,
  high: 700,
};

// Max path commands before warning - reduced for safety
const MAX_PATH_COMMANDS = 15000;
// Max paths before auto-simplification warning
const MAX_PATHS = 150;

export function ImageTracePanel({
  targetWidthMm,
  targetHeightMm,
  onTraceResult,
  disabled = false,
}: ImageTracePanelProps) {
  const [options, setOptions] = useState<TraceOptions>(DEFAULT_OPTIONS);
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('');
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  // Handle file upload
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, etc.)');
      return;
    }

    setError(null);
    setImageName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImageData(dataUrl);
      setPreviewPath(null);
    };
    reader.onerror = () => {
      setError('Failed to read image file');
    };
    reader.readAsDataURL(file);
  }, []);

  // Cancel ongoing trace
  const cancelTrace = useCallback(() => {
    abortRef.current.cancelled = true;
  }, []);

  // Simple image tracing algorithm (potrace-like edge detection)
  // Uses chunked processing to avoid freezing
  const traceImage = useCallback(async () => {
    if (!imageData || !canvasRef.current) return;

    // Reset abort flag
    abortRef.current = { cancelled: false };
    const abortSignal = abortRef.current;

    setLoading(true);
    setProgress(0);
    setError(null);

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Load image
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageData;
      });

      // Strict size limit for performance
      const maxSize = MAX_TRACE_DIMENSIONS[options.detail];
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      // Draw image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Get image data
      const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageDataObj.data;

      // Convert to grayscale and apply threshold (chunked to avoid freeze)
      const threshold = options.threshold;
      const invert = options.invert;
      const chunkSize = 50000; // Process 50k pixels at a time
      
      for (let start = 0; start < data.length; start += chunkSize * 4) {
        const end = Math.min(start + chunkSize * 4, data.length);
        for (let i = start; i < end; i += 4) {
          const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
          const isTransparent = options.removeBackground && data[i + 3] < 128;
          let value = gray > threshold ? 255 : 0;
          if (invert) value = 255 - value;
          if (isTransparent) value = 255;
          data[i] = data[i + 1] = data[i + 2] = value;
          data[i + 3] = 255;
        }
        // Yield to UI thread
        if (start + chunkSize * 4 < data.length) {
          await new Promise(r => setTimeout(r, 0));
        }
      }

      ctx.putImageData(imageDataObj, 0, 0);

      // Check if cancelled
      if (abortSignal.cancelled) {
        setLoading(false);
        return;
      }

      setProgress(30);
      await new Promise(r => setTimeout(r, 0));

      // Trace contours using marching squares algorithm (chunked)
      const paths = await traceContoursAsync(
        imageDataObj,
        options.smoothing,
        abortSignal,
        (p) => setProgress(30 + Math.round(p * 60)) // 30-90%
      );

      // Check if cancelled
      if (abortSignal.cancelled) {
        setLoading(false);
        return;
      }

      setProgress(90);

      if (paths.length === 0) {
        setError('No contours found. Try adjusting threshold.');
        setPreviewPath(null);
        return;
      }

      // Scale paths to target size
      const scaledPaths = scalePaths(paths, canvas.width, canvas.height, targetWidthMm, targetHeightMm);
      
      // Combine all paths
      const combinedPath = scaledPaths.join(' ');
      
      // Check complexity - paths count with auto-fallback suggestion
      if (paths.length > MAX_PATHS) {
        // If on high/medium detail, suggest lowering
        if (options.detail !== 'low') {
          setError(`Too many paths (${paths.length}). Switching to Low detail is recommended.`);
        } else {
          setError(`Too many paths (${paths.length}). Try adjusting threshold or use a simpler image with cleaner edges.`);
        }
        setPreviewPath(null);
        return;
      }
      
      // Check complexity - command count with helpful message
      const commandCount = (combinedPath.match(/[MLHVCSQTAZ]/gi) || []).length;
      if (commandCount > MAX_PATH_COMMANDS) {
        const suggestion = options.detail !== 'low' 
          ? 'Try Low detail setting.' 
          : 'Use a simpler image with cleaner edges.';
        setError(`Path too complex (${commandCount} commands). ${suggestion}`);
        setPreviewPath(null);
        return;
      }
      
      // Warn about moderate complexity but still allow
      if (commandCount > MAX_PATH_COMMANDS * 0.7) {
        console.warn(`[ImageTrace] High complexity: ${commandCount} commands, ${paths.length} paths`);
      }
      
      setPreviewPath(combinedPath);
      setProgress(100);

    } catch (err) {
      if (!abortSignal.cancelled) {
        setError(err instanceof Error ? err.message : 'Tracing failed');
        setPreviewPath(null);
      }
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }, [imageData, options, targetWidthMm, targetHeightMm]);

  // Apply trace result to document
  const handleApply = useCallback(() => {
    if (!previewPath) return;

    if (options.mode === 'silhouette') {
      // Create shape element for CUT layer
      const element: ShapeElement = {
        id: generateId(),
        kind: 'shape',
        source: 'builtin',
        svgPathD: previewPath,
        style: 'CUT',
        transform: {
          xMm: targetWidthMm / 2,
          yMm: targetHeightMm / 2,
          rotateDeg: 0,
          scaleX: 1,
          scaleY: 1,
        },
      };
      onTraceResult(element, 'CUT');
    } else {
      // Create engrave sketch element for ENGRAVE layer
      const element: EngraveSketchElement = {
        id: generateId(),
        kind: 'engraveSketch',
        svgPathD: [previewPath],
        strokeMm: 0.3,
        transform: {
          xMm: targetWidthMm / 2,
          yMm: targetHeightMm / 2,
          rotateDeg: 0,
          scaleX: 1,
          scaleY: 1,
        },
      };
      onTraceResult(element, 'ENGRAVE');
    }

    // Reset state
    setImageData(null);
    setPreviewPath(null);
    setImageName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previewPath, options.mode, targetWidthMm, targetHeightMm, onTraceResult]);

  // Reset panel
  const handleReset = useCallback(() => {
    setImageData(null);
    setPreviewPath(null);
    setImageName('');
    setError(null);
    setOptions(DEFAULT_OPTIONS);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Auto-trace when image or options change
  useEffect(() => {
    if (imageData) {
      const timer = setTimeout(() => {
        traceImage();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [imageData, options, traceImage]);

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-cyan-400" />
          Image Trace
        </h3>
        {imageData && (
          <button
            onClick={handleReset}
            className="text-slate-400 hover:text-white transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Upload area */}
      {!imageData ? (
        <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-cyan-500 hover:bg-slate-700/50 transition-colors">
          <Upload className="w-8 h-8 text-slate-400" />
          <span className="text-sm text-slate-300">Upload image to trace</span>
          <span className="text-xs text-slate-500">PNG, JPG supported</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={disabled}
          />
        </label>
      ) : (
        <>
          {/* Image info */}
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-700/50 rounded p-2">
            <ImageIcon className="w-4 h-4" />
            <span className="truncate flex-1">{imageName}</span>
          </div>

          {/* Mode selection */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400">Output Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setOptions(o => ({ ...o, mode: 'silhouette' }))}
                className={`flex items-center justify-center gap-2 p-2 rounded-lg border transition-colors ${
                  options.mode === 'silhouette'
                    ? 'bg-cyan-900/50 border-cyan-500 text-cyan-300'
                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                }`}
              >
                <Scissors className="w-4 h-4" />
                <span className="text-xs">Silhouette Cut</span>
              </button>
              <button
                onClick={() => setOptions(o => ({ ...o, mode: 'sketch' }))}
                className={`flex items-center justify-center gap-2 p-2 rounded-lg border transition-colors ${
                  options.mode === 'sketch'
                    ? 'bg-cyan-900/50 border-cyan-500 text-cyan-300'
                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                }`}
              >
                <Pencil className="w-4 h-4" />
                <span className="text-xs">Engrave Sketch</span>
              </button>
            </div>
          </div>

          {/* Threshold */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400">Threshold</label>
              <span className="text-xs text-slate-500">{options.threshold}</span>
            </div>
            <input
              type="range"
              min={0}
              max={255}
              value={options.threshold}
              onChange={(e) => setOptions(o => ({ ...o, threshold: Number(e.target.value) }))}
              className="w-full accent-cyan-500"
            />
          </div>

          {/* Smoothing */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400">Smoothing</label>
              <span className="text-xs text-slate-500">{(options.smoothing * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={options.smoothing}
              onChange={(e) => setOptions(o => ({ ...o, smoothing: Number(e.target.value) }))}
              className="w-full accent-cyan-500"
            />
          </div>

          {/* Detail level */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400">Detail Level</label>
            <div className="flex gap-1">
              {(['low', 'medium', 'high'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setOptions(o => ({ ...o, detail: level }))}
                  className={`flex-1 py-1 px-2 text-xs rounded transition-colors ${
                    options.detail === level
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={options.invert}
                onChange={(e) => setOptions(o => ({ ...o, invert: e.target.checked }))}
                className="rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
              />
              Invert colors
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={options.removeBackground}
                onChange={(e) => setOptions(o => ({ ...o, removeBackground: e.target.checked }))}
                className="rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
              />
              Remove transparent background
            </label>
          </div>

          {/* Preview */}
          {previewPath && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">Preview</label>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-slate-400 hover:text-white"
                >
                  {showPreview ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
              {showPreview && (
                <div className="bg-slate-900 rounded border border-slate-600 p-2 aspect-video flex items-center justify-center">
                  <svg
                    viewBox={`0 0 ${targetWidthMm} ${targetHeightMm}`}
                    className="max-w-full max-h-full"
                    style={{ width: '100%', height: 'auto' }}
                  >
                    <path
                      d={previewPath}
                      fill={options.mode === 'silhouette' ? '#333' : 'none'}
                      stroke={options.mode === 'sketch' ? '#ff0000' : '#000'}
                      strokeWidth={options.mode === 'sketch' ? 0.5 : 0.2}
                    />
                  </svg>
                </div>
              )}
            </div>
          )}

          {/* Progress bar during tracing */}
          {loading && progress > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Tracing... {progress}%</span>
                <button
                  onClick={cancelTrace}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-cyan-500 h-2 rounded-full transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Apply button */}
          <button
            onClick={handleApply}
            disabled={!previewPath || loading || disabled}
            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              previewPath && !loading && !disabled
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Tracing...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Insert Traced Shape
              </>
            )}
          </button>
        </>
      )}

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Error display */}
      {error && (
        <div className="text-xs text-red-400 bg-red-900/30 rounded p-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}

/**
 * Simple marching squares contour tracing (async for non-blocking)
 * With abort signal and progress callback
 */
async function traceContoursAsync(
  imageData: ImageData,
  smoothing: number,
  abortSignal: { cancelled: boolean },
  onProgress?: (progress: number) => void
): Promise<string[]> {
  const { data, width, height } = imageData;
  const paths: string[] = [];
  const visited = new Set<string>();

  const getPixel = (x: number, y: number): number => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0;
    const idx = (y * width + x) * 4;
    return data[idx] < 128 ? 1 : 0;
  };

  let processedRows = 0;
  const totalRows = height - 1;
  const yieldInterval = 20; // Yield more frequently for responsiveness

  for (let y = 0; y < height - 1; y++) {
    // Check for cancellation
    if (abortSignal.cancelled) {
      return [];
    }

    for (let x = 0; x < width - 1; x++) {
      const key = `${x},${y}`;
      if (visited.has(key)) continue;

      const p = getPixel(x, y);
      const pRight = getPixel(x + 1, y);
      const pBottom = getPixel(x, y + 1);

      if (p !== pRight || p !== pBottom) {
        const contour = traceContour(x, y, getPixel, visited, width, height);
        if (contour.length > 3) {
          const smoothed = smoothContour(contour, smoothing);
          paths.push(contourToPath(smoothed));
        }
      }
    }
    
    processedRows++;
    if (processedRows % yieldInterval === 0) {
      // Report progress
      if (onProgress) {
        onProgress(processedRows / totalRows);
      }
      // Yield to UI thread
      await new Promise(r => setTimeout(r, 0));
    }
  }

  return paths;
}

// Synchronous version for backwards compatibility
function traceContours(imageData: ImageData, smoothing: number): string[] {
  const { data, width, height } = imageData;
  const paths: string[] = [];
  const visited = new Set<string>();

  const getPixel = (x: number, y: number): number => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0;
    const idx = (y * width + x) * 4;
    return data[idx] < 128 ? 1 : 0;
  };

  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const key = `${x},${y}`;
      if (visited.has(key)) continue;

      const p = getPixel(x, y);
      const pRight = getPixel(x + 1, y);
      const pBottom = getPixel(x, y + 1);

      if (p !== pRight || p !== pBottom) {
        const contour = traceContour(x, y, getPixel, visited, width, height);
        if (contour.length > 3) {
          const smoothed = smoothContour(contour, smoothing);
          paths.push(contourToPath(smoothed));
        }
      }
    }
  }

  return paths;
}

/**
 * Trace a single contour using marching squares
 */
function traceContour(
  startX: number,
  startY: number,
  getPixel: (x: number, y: number) => number,
  visited: Set<string>,
  width: number,
  height: number
): Array<{ x: number; y: number }> {
  const contour: Array<{ x: number; y: number }> = [];
  let x = startX;
  let y = startY;
  let dir = 0; // 0=right, 1=down, 2=left, 3=up

  const maxSteps = width * height;
  let steps = 0;

  do {
    const key = `${x},${y}`;
    visited.add(key);
    contour.push({ x, y });

    // Marching squares lookup
    const tl = getPixel(x, y);
    const tr = getPixel(x + 1, y);
    const bl = getPixel(x, y + 1);
    const br = getPixel(x + 1, y + 1);
    const cell = (tl << 3) | (tr << 2) | (br << 1) | bl;

    // Direction based on cell configuration
    switch (cell) {
      case 1: case 5: case 13: dir = 3; break;
      case 2: case 3: case 7: dir = 0; break;
      case 4: case 12: case 14: dir = 1; break;
      case 8: case 10: case 11: dir = 2; break;
      case 6: dir = (dir === 3) ? 0 : 1; break;
      case 9: dir = (dir === 0) ? 3 : 2; break;
      default: break;
    }

    // Move in direction
    switch (dir) {
      case 0: x++; break;
      case 1: y++; break;
      case 2: x--; break;
      case 3: y--; break;
    }

    steps++;
    if (steps > maxSteps) break;

  } while (x !== startX || y !== startY);

  return contour;
}

/**
 * Smooth contour points using moving average
 */
function smoothContour(
  contour: Array<{ x: number; y: number }>,
  amount: number
): Array<{ x: number; y: number }> {
  if (amount <= 0 || contour.length < 3) return contour;

  const windowSize = Math.max(1, Math.round(amount * 5));
  const result: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < contour.length; i++) {
    let sumX = 0;
    let sumY = 0;
    let count = 0;

    for (let j = -windowSize; j <= windowSize; j++) {
      const idx = (i + j + contour.length) % contour.length;
      sumX += contour[idx].x;
      sumY += contour[idx].y;
      count++;
    }

    result.push({
      x: sumX / count,
      y: sumY / count,
    });
  }

  return result;
}

/**
 * Convert contour points to SVG path string
 */
function contourToPath(contour: Array<{ x: number; y: number }>): string {
  if (contour.length === 0) return '';

  const commands: string[] = [];
  commands.push(`M ${contour[0].x.toFixed(2)} ${contour[0].y.toFixed(2)}`);

  for (let i = 1; i < contour.length; i++) {
    commands.push(`L ${contour[i].x.toFixed(2)} ${contour[i].y.toFixed(2)}`);
  }

  commands.push('Z');
  return commands.join(' ');
}

/**
 * Scale paths to fit target dimensions
 */
function scalePaths(
  paths: string[],
  sourceWidth: number,
  sourceHeight: number,
  targetWidthMm: number,
  targetHeightMm: number
): string[] {
  const scaleX = (targetWidthMm * 0.7) / sourceWidth;
  const scaleY = (targetHeightMm * 0.7) / sourceHeight;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = (targetWidthMm - sourceWidth * scale) / 2;
  const offsetY = (targetHeightMm - sourceHeight * scale) / 2;

  return paths.map(path => {
    return path.replace(/(-?\d+\.?\d*)/g, (match, num, offset, str) => {
      const val = parseFloat(num);
      // Determine if this is X or Y coordinate based on position
      const prevChar = str[offset - 1];
      const isY = prevChar === ' ' || prevChar === ',';
      
      if (isY) {
        return (val * scale + offsetY).toFixed(2);
      } else {
        return (val * scale + offsetX).toFixed(2);
      }
    });
  });
}
