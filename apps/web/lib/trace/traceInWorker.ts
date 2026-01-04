import { preprocessForTrace, type PreprocessInput, type PreprocessOptions, type TracePreset } from './preprocess';

export type TraceWorkerPreset = TracePreset;

export type TraceWorkerOptions = {
  preset: TraceWorkerPreset;
  targetWidthMm: number;
  targetHeightMm: number;
  maxPaths?: number;
  maxCommands?: number;
  maxDLength?: number;
} & PreprocessOptions;

export type TraceWorkerResult = {
  combinedPath: string;
  paths: string[];
  stats: {
    width: number;
    height: number;
    pathsIn: number;
    pathsOut: number;
    commands: number;
    dLength: number;
    ms: number;
    localBounds: { xMm: number; yMm: number; widthMm: number; heightMm: number };
  };
};

type WorkerMsg =
  | { type: 'TRACE_PROGRESS'; requestId: string; progress: number }
  | { type: 'TRACE_RESULT'; requestId: string; paths: string[]; combinedPath: string; stats: TraceWorkerResult['stats'] }
  | { type: 'TRACE_ERROR'; requestId: string; message: string };

export async function traceInWorker(
  input: PreprocessInput,
  options: TraceWorkerOptions,
  handlers?: { onProgress?: (progress01: number) => void; signal?: AbortSignal }
): Promise<TraceWorkerResult> {
  if (typeof window === 'undefined') {
    throw new Error('traceInWorker can only run in the browser');
  }

  const onProgress = handlers?.onProgress;
  const signal = handlers?.signal;

  const preset = options.preset;
  // Balanced limits - enough for good quality, early termination prevents OOM
  const maxPaths = options.maxPaths ?? (preset === 'detailed' ? 60 : 40);
  const maxCommands = options.maxCommands ?? (preset === 'detailed' ? 6000 : 4000);
  const maxDLength = options.maxDLength ?? 60000;

  // Early bail if input is too large (>1.5MB data URL)
  if (input.dataUrl && input.dataUrl.length > 1.5 * 1024 * 1024) {
    throw new Error('Image too large. Please use a smaller image (max ~1MB).');
  }

  onProgress?.(0.02);

  const image = await preprocessForTrace(input, {
    preset,
    maxDim: options.maxDim,
    threshold: options.threshold,
    invert: options.invert,
    removeBackground: options.removeBackground,
  });

  onProgress?.(0.12);

  const worker = new Worker(new URL('./trace.worker.ts', import.meta.url), { type: 'module' });
  const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const cleanup = () => {
    worker.terminate();
  };

  const abortListener = () => {
    cleanup();
  };

  if (signal) {
    if (signal.aborted) {
      cleanup();
      throw new Error('Cancelled');
    }
    signal.addEventListener('abort', abortListener, { once: true });
  }

  try {
    return await new Promise<TraceWorkerResult>((resolve, reject) => {
      worker.onmessage = (ev: MessageEvent<WorkerMsg>) => {
        const msg = ev.data;
        if (!msg || msg.requestId !== requestId) return;

        if (msg.type === 'TRACE_PROGRESS') {
          const p = 0.12 + msg.progress * 0.88;
          onProgress?.(Math.max(0, Math.min(1, p)));
          return;
        }

        if (msg.type === 'TRACE_ERROR') {
          reject(new Error(msg.message));
          return;
        }

        if (msg.type === 'TRACE_RESULT') {
          resolve({ combinedPath: msg.combinedPath, paths: msg.paths, stats: msg.stats });
        }
      };

      worker.onerror = () => {
        reject(new Error('Trace worker failed')); 
      };

      worker.postMessage(
        {
          type: 'TRACE',
          requestId,
          image,
          settings: {
            preset,
            targetWidthMm: options.targetWidthMm,
            targetHeightMm: options.targetHeightMm,
            maxPaths,
            maxCommands,
            maxDLength,
          },
        },
        [image.data.buffer]
      );
    });
  } finally {
    if (signal) {
      signal.removeEventListener('abort', abortListener);
    }
    cleanup();
  }
}
