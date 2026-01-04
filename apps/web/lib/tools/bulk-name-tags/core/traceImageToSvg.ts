export type TraceDetail = 'low' | 'medium' | 'high';

export type TraceImageToSvgOptions = {
  detail: TraceDetail;
  threshold: number; // 0..255
  removeSpecks: boolean;
};

export type TraceImageToSvgResult = {
  svg: string;
  debug: string[];
  canvasWidth: number;
  canvasHeight: number;
  pathCount: number;
};

export type TraceImageToPotraceOptions = {
  targetWidthMm: number;
  targetHeightMm: number;
  threshold?: number; // 80..220
  denoise?: number; // 0..3
  autoInvert?: boolean;
  invert?: boolean;
  optTolerance?: number; // 0..1
};

export type TraceImageToPotraceResult = {
  svg: string;
  debug: string[];
  combinedPath: string;
  pathCount: number;
};

type ImageTracerModule = {
  imagedataToSVG: (imgd: ImageData, options?: any) => string;
};

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function buildTracerOptions(detail: TraceDetail) {
  // ImageTracerJS options: https://github.com/jankovicsandras/imagetracerjs/blob/master/options.md
  if (detail === 'low') {
    return {
      numberofcolors: 2,
      pathomit: 40,
      ltres: 1,
      qtres: 2,
      scale: 1,
      strokewidth: 1,
    };
  }

  if (detail === 'high') {
    return {
      numberofcolors: 2,
      pathomit: 10,
      ltres: 0.2,
      qtres: 0.8,
      scale: 1,
      strokewidth: 1,
    };
  }

  return {
    numberofcolors: 2,
    pathomit: 20,
    ltres: 0.5,
    qtres: 1.2,
    scale: 1,
    strokewidth: 1,
  };
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image decode failed'));
    img.src = dataUrl;
  });
}

function preprocessToBlackOnWhite(imgd: ImageData, threshold: number): ImageData {
  const t = clamp(threshold, 0, 255);
  const out = new ImageData(imgd.width, imgd.height);

  for (let i = 0; i < imgd.data.length; i += 4) {
    const r = imgd.data[i];
    const g = imgd.data[i + 1];
    const b = imgd.data[i + 2];
    const a = imgd.data[i + 3];

    // Treat transparency as background.
    if (a < 8) {
      out.data[i] = 255;
      out.data[i + 1] = 255;
      out.data[i + 2] = 255;
      out.data[i + 3] = 255;
      continue;
    }

    // Luminance threshold.
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const isBlack = lum < t;

    const v = isBlack ? 0 : 255;
    out.data[i] = v;
    out.data[i + 1] = v;
    out.data[i + 2] = v;
    out.data[i + 3] = 255;
  }

  return out;
}

function maybeRemoveTinyPaths(svg: string, removeSpecks: boolean, debug: string[]): string {
  if (!removeSpecks) return svg;

  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, 'image/svg+xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    debug.push('specks:skip (svg parse error)');
    return svg;
  }

  const paths = Array.from(doc.querySelectorAll('path'));
  let removed = 0;
  for (const p of paths) {
    const d = p.getAttribute('d') || '';
    if (d.length > 0 && d.length < 80) {
      p.remove();
      removed++;
    }
  }

  debug.push(`specks:removed ${removed}`);

  const root = doc.querySelector('svg');
  if (!root) return svg;

  return new XMLSerializer().serializeToString(root);
}

export async function traceImageToSvg(dataUrl: string, options: TraceImageToSvgOptions): Promise<TraceImageToSvgResult> {
  const debug: string[] = [];
  if (!dataUrl) throw new Error('Missing image dataUrl');

  const threshold = clamp(options.threshold, 0, 255);
  debug.push(`threshold:${threshold}`);
  debug.push(`detail:${options.detail}`);

  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  debug.push(`canvas:${canvas.width}x${canvas.height}`);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  const imgd = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const bw = preprocessToBlackOnWhite(imgd, threshold);

  const imported: any = await import('imagetracerjs');
  const mod: ImageTracerModule = (imported?.default || imported) as any;
  const tracerOptions = buildTracerOptions(options.detail);
  const svg = mod.imagedataToSVG(bw, tracerOptions);

  const cleaned = maybeRemoveTinyPaths(svg, options.removeSpecks, debug);

  const parser = new DOMParser();
  const doc = parser.parseFromString(cleaned, 'image/svg+xml');
  const paths = doc.querySelectorAll('path');
  const pathCount = paths.length;
  debug.push(`paths:${pathCount}`);

  if (pathCount === 0) {
    throw new Error('Trace produced empty SVG. Try increasing threshold or detail.');
  }

  return { 
    svg: cleaned, 
    debug, 
    canvasWidth: canvas.width, 
    canvasHeight: canvas.height,
    pathCount 
  };
}

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

export async function traceImageToLaserSvgViaPotrace(
  dataUrl: string,
  options: TraceImageToPotraceOptions
): Promise<TraceImageToPotraceResult> {
  const debug: string[] = [];
  if (!dataUrl) throw new Error('Missing image dataUrl');

  const targetWidthMm = Number(options.targetWidthMm);
  const targetHeightMm = Number(options.targetHeightMm);

  if (!Number.isFinite(targetWidthMm) || !Number.isFinite(targetHeightMm) || targetWidthMm <= 0 || targetHeightMm <= 0) {
    throw new Error('Invalid target size');
  }

  const payload = {
    dataUrl,
    mode: 'CUT_SILHOUETTE' as const,
    targetWidthMm,
    targetHeightMm,
    threshold: options.threshold,
    denoise: options.denoise,
    autoInvert: options.autoInvert,
    invert: options.invert,
    optTolerance: options.optTolerance,
  };

  const res = await fetch('/api/trace/potrace', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((typeof json?.error === 'string' && json.error) || 'Potrace trace failed');
  }

  if (!json?.ok) {
    throw new Error((typeof json?.error === 'string' && json.error) || 'Potrace trace failed');
  }

  const combinedPath = typeof json?.combinedPath === 'string' ? json.combinedPath : '';
  const paths = Array.isArray(json?.paths) ? (json.paths as unknown[]).filter((p) => typeof p === 'string') : [];
  const stats = json?.stats;

  if (typeof stats?.commands === 'number') debug.push(`commands:${stats.commands}`);
  if (typeof stats?.pathsIn === 'number' && typeof stats?.pathsOut === 'number') {
    debug.push(`paths:${stats.pathsIn}->${stats.pathsOut}`);
  }
  if (typeof stats?.ms === 'number') debug.push(`ms:${stats.ms}`);
  if (typeof stats?.speckleRatio === 'number') debug.push(`speckleRatio:${stats.speckleRatio.toFixed(3)}`);

  const pathCount = paths.length;
  if (!combinedPath || pathCount === 0) {
    throw new Error('Potrace produced empty result');
  }

  const halfW = round(targetWidthMm / 2);
  const halfH = round(targetHeightMm / 2);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${round(targetWidthMm)}mm" height="${round(
    targetHeightMm
  )}mm" viewBox="0 0 ${round(targetWidthMm)} ${round(targetHeightMm)}" fill="none" stroke="black" stroke-width="0.8" vector-effect="non-scaling-stroke">
  <g transform="translate(${halfW}, ${halfH})">
    ${paths
      .map(
        (d: string) =>
          `<path d="${d}" fill="none" stroke="black" stroke-width="0.8" vector-effect="non-scaling-stroke" />`
      )
      .join('\n    ')}
  </g>
</svg>`;

  return { svg, debug, combinedPath, pathCount };
}
