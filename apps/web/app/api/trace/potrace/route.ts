import { NextRequest, NextResponse } from 'next/server';
import { createRequire } from 'module';
import { preprocessForPotrace, type TraceQualityMode } from '@/lib/trace/preprocessForPotrace';

export const runtime = 'nodejs';

type TracePotraceRequest = {
  dataUrl: string;
  mode: TraceQualityMode;
  targetWidthMm: number;
  targetHeightMm: number;
  threshold?: number;
  denoise?: number;
  autoInvert?: boolean;
  invert?: boolean;
  optTolerance?: number;
};

type TracePotraceResponse =
  | {
      ok: true;
      paths: string[];
      combinedPath: string;
      stats: {
        width: number;
        height: number;
        pathsIn: number;
        pathsOut: number;
        commands: number;
        dLength: number;
        ms: number;
        localBounds: { xMm: number; yMm: number; widthMm: number; heightMm: number };
        speckleRatio: number;
      };
      debug: any;
    }
  | { ok: false; error: string; debug?: any };

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function countCommands(d: string): number {
  const m = d.match(/[MLHVCSQTAZ]/gi);
  return m ? m.length : 0;
}

function extractPathDsFromSvg(svg: string): string[] {
  const out: string[] = [];
  const re = /<path\b[^>]*\bd=("([^"]*)"|'([^']*)')[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg))) {
    const d = (m[2] ?? m[3] ?? '').trim();
    if (d) out.push(d);
  }
  return out;
}

function computeBBoxArea(pathD: string): { area: number; minX: number; minY: number; maxX: number; maxY: number } {
  const nums = pathD.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
  if (!nums || nums.length < 4) return { area: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = Number.parseFloat(nums[i]);
    const y = Number.parseFloat(nums[i + 1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return { area: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  const w = Math.max(0, maxX - minX);
  const h = Math.max(0, maxY - minY);
  return { area: w * h, minX, minY, maxX, maxY };
}

function scalePathsCentered(
  paths: string[],
  sourceWidth: number,
  sourceHeight: number,
  targetWidthMm: number,
  targetHeightMm: number,
  fillPercent: number
): { paths: string[]; bounds: { xMm: number; yMm: number; widthMm: number; heightMm: number } } {
  const scaleX = (targetWidthMm * fillPercent) / sourceWidth;
  const scaleY = (targetHeightMm * fillPercent) / sourceHeight;
  const scale = Math.min(scaleX, scaleY);

  const halfW = sourceWidth / 2;
  const halfH = sourceHeight / 2;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const out = paths.map((path) => {
    let idx = 0;
    return path.replace(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g, (match) => {
      const v = Number.parseFloat(match);
      const outV = idx % 2 === 0 ? (v - halfW) * scale : (v - halfH) * scale;
      if (idx % 2 === 0) {
        minX = Math.min(minX, outV);
        maxX = Math.max(maxX, outV);
      } else {
        minY = Math.min(minY, outV);
        maxY = Math.max(maxY, outV);
      }
      idx++;
      return outV.toFixed(3);
    });
  });

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    minX = -10;
    minY = -10;
    maxX = 10;
    maxY = 10;
  }

  return { paths: out, bounds: { xMm: minX, yMm: minY, widthMm: maxX - minX, heightMm: maxY - minY } };
}

function applySpeckleRemovalMm(args: {
  paths: string[];
  targetWidthMm: number;
  targetHeightMm: number;
}): { kept: string[]; tinyCount: number; total: number; thresholdMm2: number } {
  const { paths, targetWidthMm, targetHeightMm } = args;
  const artboardArea = Math.max(1e-6, targetWidthMm * targetHeightMm);
  const thresholdMm2 = Math.max(0.08, artboardArea * 0.000005);

  const kept: string[] = [];
  let tinyCount = 0;

  for (const p of paths) {
    const b = computeBBoxArea(p);
    if (b.area < thresholdMm2) {
      tinyCount++;
      continue;
    }
    kept.push(p);
  }

  return { kept, tinyCount, total: paths.length, thresholdMm2 };
}

function getPotraceParams(mode: TraceQualityMode, optBump: number) {
  if (mode === 'CUT_SILHOUETTE') {
    return {
      turdSize: 0,
      alphaMax: 0.05,
      optCurve: false,
      optTolerance: 0.0 + optBump,
      turnPolicy: 'minority',
    };
  }

  return {
    turdSize: 0,
    alphaMax: 0.15,
    optCurve: false,
    optTolerance: 0.0 + optBump,
    turnPolicy: 'minority',
  };
}

async function traceWithPotrace(args: {
  buffer: Buffer;
  mode: TraceQualityMode;
  optBump: number;
}): Promise<string> {
  let mod: any;
  try {
    // Force Node CJS load (avoid bundling that can break potrace's Jimp instanceof checks)
    const require = createRequire(import.meta.url);
    mod = require('potrace');
  } catch (e) {
    throw new Error('Missing dependency: potrace');
  }
  const PotraceCtor = mod?.Potrace || mod?.default?.Potrace || mod?.default || mod;
  if (!PotraceCtor) {
    throw new Error('potrace module not available');
  }

  const params = getPotraceParams(args.mode, args.optBump);

  const tracer = new PotraceCtor();
  if (typeof tracer.setParameters === 'function') {
    tracer.setParameters({
      turdSize: params.turdSize,
      alphamax: params.alphaMax,
      optCurve: (params as any).optCurve,
      optTolerance: params.optTolerance,
      turnPolicy: params.turnPolicy,
      color: 'black',
      background: 'transparent',
      threshold: 128,
    });
  }

  return await new Promise<string>((resolve, reject) => {
    tracer.loadImage(args.buffer, (err: any) => {
      if (err) {
        reject(err);
        return;
      }
      try {
        const svg: string = tracer.getSVG();
        resolve(svg);
      } catch (e) {
        reject(e);
      }
    });
  });
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();

  try {
    const body = (await req.json()) as TracePotraceRequest;
    const dataUrl = (body?.dataUrl || '').trim();

    if (!dataUrl) {
      return NextResponse.json({ ok: false, error: 'Missing dataUrl' } satisfies TracePotraceResponse, { status: 400 });
    }

    const mode = (body?.mode || 'ENGRAVE_LINEART') as TraceQualityMode;
    const targetWidthMm = Number(body?.targetWidthMm);
    const targetHeightMm = Number(body?.targetHeightMm);

    if (!Number.isFinite(targetWidthMm) || !Number.isFinite(targetHeightMm) || targetWidthMm <= 0 || targetHeightMm <= 0) {
      return NextResponse.json({ ok: false, error: 'Missing target dimensions' } satisfies TracePotraceResponse, { status: 400 });
    }

    const threshold = clamp(body?.threshold ?? (mode === 'CUT_SILHOUETTE' ? 175 : 145), 80, 220);
    const denoise = clamp(body?.denoise ?? (mode === 'CUT_SILHOUETTE' ? 2 : 1), 0, 3);
    const autoInvert = body?.autoInvert !== false;
    const forceInvert = body?.invert === true;
    const optTolerance = clamp(Number(body?.optTolerance ?? 0), 0, 1);

    const pre = await preprocessForPotrace(
      { dataUrl },
      {
        mode,
        threshold,
        denoise,
        autoInvert,
        forceInvert,
      }
    );

    // Try 2 passes: second pass loosens optTolerance to simplify if too complex
    let svg = '';
    let lastErr: any = null;
    for (let i = 0; i < 1; i++) {
      try {
        svg = await traceWithPotrace({ buffer: pre.buffer, mode, optBump: optTolerance });
        break;
      } catch (e) {
        lastErr = e;
      }
    }

    if (!svg) {
      const msg =
        lastErr && typeof (lastErr as any).message === 'string'
          ? String((lastErr as any).message)
          : typeof lastErr === 'string'
            ? lastErr
            : 'Trace failed';
      const devErr =
        process.env.NODE_ENV !== 'production'
          ? {
              name: String((lastErr as any)?.name || 'Error'),
              message: msg,
              stack: typeof (lastErr as any)?.stack === 'string' ? String((lastErr as any).stack) : undefined,
            }
          : undefined;
      if (devErr) {
        console.error('[trace/potrace] error:', devErr);
      }
      return NextResponse.json(
        { ok: false, error: msg, debug: { preprocess: pre.debug, error: devErr } } satisfies TracePotraceResponse,
        { status: 500 }
      );
    }

    const rawPathDs = extractPathDsFromSvg(svg);
    if (rawPathDs.length === 0) {
      return NextResponse.json({ ok: false, error: 'No usable vector found', debug: { preprocess: pre.debug } } satisfies TracePotraceResponse, { status: 200 });
    }

    const fillPercent = mode === 'CUT_SILHOUETTE' ? 0.75 : 0.7;
    const scaled = scalePathsCentered(rawPathDs, pre.width, pre.height, targetWidthMm, targetHeightMm, fillPercent);

    const speck = applySpeckleRemovalMm({
      paths: scaled.paths,
      targetWidthMm,
      targetHeightMm,
    });

    const speckleRatio = speck.total > 0 ? speck.tinyCount / speck.total : 1;

    if (speckleRatio > 0.8) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Image too noisy; increase denoise or threshold',
          debug: { preprocess: pre.debug, speckleRatio, thresholdMm2: speck.thresholdMm2 },
        } satisfies TracePotraceResponse,
        { status: 200 }
      );
    }

    const kept = speck.kept;

    if (kept.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'No usable vector found',
          debug: { preprocess: pre.debug, speckleRatio, thresholdMm2: speck.thresholdMm2 },
        } satisfies TracePotraceResponse,
        { status: 200 }
      );
    }

    const combinedPath = kept.join(' ');
    const commands = countCommands(combinedPath);

    if (commands > 30000) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Trace result too complex; increase denoise or threshold',
          debug: { preprocess: pre.debug, commands },
        } satisfies TracePotraceResponse,
        { status: 200 }
      );
    }

    const ms = Date.now() - t0;

    return NextResponse.json(
      {
        ok: true,
        paths: kept,
        combinedPath,
        stats: {
          width: pre.width,
          height: pre.height,
          pathsIn: rawPathDs.length,
          pathsOut: kept.length,
          commands,
          dLength: combinedPath.length,
          ms,
          localBounds: scaled.bounds,
          speckleRatio,
        },
        debug: {
          preprocess: pre.debug,
          speckle: { tinyCount: speck.tinyCount, total: speck.total, thresholdMm2: speck.thresholdMm2 },
        },
      } satisfies TracePotraceResponse,
      { status: 200 }
    );
  } catch (e) {
    const message =
      e && typeof (e as any).message === 'string' ? String((e as any).message) : typeof e === 'string' ? e : 'Trace failed';
    const devErr =
      process.env.NODE_ENV !== 'production'
        ? {
            name: String((e as any)?.name || 'Error'),
            message,
            stack: typeof (e as any)?.stack === 'string' ? String((e as any).stack) : undefined,
          }
        : undefined;
    if (devErr) {
      console.error('[trace/potrace] exception:', devErr);
    }
    return NextResponse.json(
      { ok: false, error: message, debug: { error: devErr } } satisfies TracePotraceResponse,
      { status: 500 }
    );
  }
}
