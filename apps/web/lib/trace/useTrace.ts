'use client';

/**
 * useTrace Hook
 * React hook for bitmap-to-SVG tracing with Web Worker
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { TraceOptions, TraceResult, TraceProgress, TraceWorkerMessage, TraceWorkerResponse } from './types';
import { DEFAULT_TRACE_OPTIONS } from './types';

export type TraceState = 'idle' | 'loading' | 'tracing' | 'completed' | 'cancelled' | 'error';

export interface UseTraceReturn {
  state: TraceState;
  progress: TraceProgress | null;
  result: TraceResult | null;
  error: string | null;
  isTracing: boolean;
  trace: (imageSource: string | File | Blob, options?: Partial<TraceOptions>) => Promise<TraceResult | null>;
  cancel: () => void;
  reset: () => void;
}

let workerInstance: Worker | null = null;
let pendingResolve: ((result: TraceResult | null) => void) | null = null;
let pendingReject: ((error: Error) => void) | null = null;

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker(
      new URL('./traceWorkerV2.ts', import.meta.url),
      { type: 'module' }
    );
  }
  return workerInstance;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function imageToImageData(img: HTMLImageElement, maxDim: number = 2000): ImageData {
  let { width, height } = img;
  
  // Scale down if too large
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.floor(width * scale);
    height = Math.floor(height * scale);
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

export function useTrace(): UseTraceReturn {
  const [state, setState] = useState<TraceState>('idle');
  const [progress, setProgress] = useState<TraceProgress | null>(null);
  const [result, setResult] = useState<TraceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentJobId = useRef<string | null>(null);

  const handleWorkerMessage = useCallback((event: MessageEvent<TraceWorkerResponse>) => {
    const { type, id, progress: prog, result: res, error: err } = event.data;
    
    if (id !== currentJobId.current) return;
    
    switch (type) {
      case 'progress':
        if (prog) setProgress(prog);
        break;
      case 'result':
        if (res) {
          setState('completed');
          setResult(res);
          pendingResolve?.(res);
        }
        currentJobId.current = null;
        break;
      case 'error':
        setState('error');
        setError(err || 'Trace failed');
        pendingReject?.(new Error(err || 'Trace failed'));
        currentJobId.current = null;
        break;
      case 'cancelled':
        setState('cancelled');
        pendingResolve?.(null);
        currentJobId.current = null;
        break;
    }
  }, []);

  useEffect(() => {
    const worker = getWorker();
    worker.addEventListener('message', handleWorkerMessage);
    
    return () => {
      worker.removeEventListener('message', handleWorkerMessage);
    };
  }, [handleWorkerMessage]);

  const trace = useCallback(async (
    imageSource: string | File | Blob,
    options?: Partial<TraceOptions>
  ): Promise<TraceResult | null> => {
    // Cancel any existing job
    if (currentJobId.current) {
      const worker = getWorker();
      worker.postMessage({ type: 'cancel', id: currentJobId.current });
    }
    
    const jobId = `trace-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    currentJobId.current = jobId;
    
    setState('loading');
    setProgress(null);
    setResult(null);
    setError(null);
    
    return new Promise(async (resolve, reject) => {
      pendingResolve = resolve;
      pendingReject = reject;
      
      try {
        // Load image
        let dataUrl: string;
        if (typeof imageSource === 'string') {
          dataUrl = imageSource;
        } else {
          dataUrl = await fileToDataUrl(imageSource);
        }
        
        setProgress({ stage: 'decode', progress: 0.5, message: 'Loading image' });
        
        const img = await loadImage(dataUrl);
        const imageData = imageToImageData(img);
        
        setState('tracing');
        
        const mergedOptions: TraceOptions = {
          ...DEFAULT_TRACE_OPTIONS,
          ...options,
        };
        
        const worker = getWorker();
        const message: TraceWorkerMessage = {
          type: 'trace',
          id: jobId,
          imageData,
          options: mergedOptions,
        };
        
        worker.postMessage(message);
      } catch (err) {
        setState('error');
        const message = err instanceof Error ? err.message : 'Failed to process image';
        setError(message);
        reject(new Error(message));
        currentJobId.current = null;
      }
    });
  }, []);

  const cancel = useCallback(() => {
    if (currentJobId.current) {
      const worker = getWorker();
      worker.postMessage({ type: 'cancel', id: currentJobId.current });
      setState('cancelled');
      currentJobId.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    cancel();
    setState('idle');
    setProgress(null);
    setResult(null);
    setError(null);
  }, [cancel]);

  return {
    state,
    progress,
    result,
    error,
    isTracing: state === 'loading' || state === 'tracing',
    trace,
    cancel,
    reset,
  };
}
