/**
 * Trace System Types
 * Types for bitmap-to-SVG tracing
 */

export type TraceMode = 
  | 'silhouette'    // Single threshold, filled shapes
  | 'outline'       // Single threshold, stroked outlines
  | 'engrave'       // Single threshold, optimized for engraving
  | 'multiband'     // Multiple thresholds for grayscale
  | 'lineart';      // Centerline detection (beta)

export interface TraceOptions {
  mode: TraceMode;
  threshold: number;          // 0-255, primary threshold
  thresholds?: number[];      // For multiband mode
  invert: boolean;
  simplify: number;           // 0-10, path simplification level
  smoothing: number;          // 0-10, curve smoothing
  targetWidthMm?: number;
  targetHeightMm?: number;
  lockAspect?: boolean;
  minPathNodes?: number;      // Minimum nodes to keep a path
  maxPaths?: number;          // Max paths before warning
}

export interface TraceProgress {
  stage: 'decode' | 'preprocess' | 'trace' | 'simplify' | 'finalize';
  progress: number;           // 0-1
  message?: string;
}

export interface TraceResult {
  svg: string;
  widthPx: number;
  heightPx: number;
  pathCount: number;
  nodeCount: number;
  warnings?: string[];
}

export interface TraceWorkerMessage {
  type: 'trace' | 'cancel';
  id: string;
  imageData?: ImageData;
  options?: TraceOptions;
}

export interface TraceWorkerResponse {
  type: 'progress' | 'result' | 'error' | 'cancelled';
  id: string;
  progress?: TraceProgress;
  result?: TraceResult;
  error?: string;
}

export const DEFAULT_TRACE_OPTIONS: TraceOptions = {
  mode: 'silhouette',
  threshold: 128,
  invert: false,
  simplify: 5,
  smoothing: 3,
  lockAspect: true,
  minPathNodes: 4,
  maxPaths: 5000,
};

export const TRACE_MODE_LABELS: Record<TraceMode, string> = {
  silhouette: 'Silhouette',
  outline: 'Outline',
  engrave: 'Engrave',
  multiband: 'Multi-band Engrave',
  lineart: 'Line Art (Beta)',
};
