import { loadPathOps } from '../geometry/pathops/loadPathOps';

export type ImportedPath = { d: string; transform?: string };

export type NormalizeImportedPathsResult = {
  normalizedPathDs: string[];
  localBounds: { xMm: number; yMm: number; widthMm: number; heightMm: number };
  recommended: { scale: number; xMm: number; yMm: number };
  warnings: string[];
};

function parseSvgNumber(n: string): number {
  const v = Number.parseFloat(n);
  return Number.isFinite(v) ? v : 0;
}

function parseTransform(transform: string): number[] | null {
  // SVG matrix is [a b c d e f]
  let a = 1, b = 0, c = 0, d = 1, e = 0, f = 0;

  const ops = transform.match(/(matrix|translate|scale|rotate)\(([^)]*)\)/g);
  if (!ops) return null;

  const mul = (m: number[]) => {
    const [a2, b2, c2, d2, e2, f2] = m;
    const na = a * a2 + c * b2;
    const nb = b * a2 + d * b2;
    const nc = a * c2 + c * d2;
    const nd = b * c2 + d * d2;
    const ne = a * e2 + c * f2 + e;
    const nf = b * e2 + d * f2 + f;
    a = na; b = nb; c = nc; d = nd; e = ne; f = nf;
  };

  for (const op of ops) {
    const m = op.match(/^(matrix|translate|scale|rotate)\(([^)]*)\)$/);
    if (!m) continue;

    const kind = m[1];
    const args = m[2].split(/\s+|,/).filter(Boolean).map(parseSvgNumber);

    if (kind === 'matrix') {
      if (args.length >= 6) {
        mul([args[0], args[1], args[2], args[3], args[4], args[5]]);
      }
      continue;
    }

    if (kind === 'translate') {
      const tx = args[0] ?? 0;
      const ty = args[1] ?? 0;
      mul([1, 0, 0, 1, tx, ty]);
      continue;
    }

    if (kind === 'scale') {
      const sx = args[0] ?? 1;
      const sy = args.length > 1 ? (args[1] ?? 1) : sx;
      mul([sx, 0, 0, sy, 0, 0]);
      continue;
    }

    if (kind === 'rotate') {
      const deg = args[0] ?? 0;
      const rad = (deg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      if (args.length >= 3) {
        const cx = args[1] ?? 0;
        const cy = args[2] ?? 0;
        // T(cx,cy) * R * T(-cx,-cy)
        mul([1, 0, 0, 1, cx, cy]);
        mul([cos, sin, -sin, cos, 0, 0]);
        mul([1, 0, 0, 1, -cx, -cy]);
      } else {
        mul([cos, sin, -sin, cos, 0, 0]);
      }
      continue;
    }
  }

  return [a, b, c, d, e, f];
}

export async function normalizeImportedPaths(args: {
  paths: ImportedPath[];
  targetWidthMm: number;
  targetHeightMm: number;
  fillPercent?: number;
}): Promise<NormalizeImportedPathsResult> {
  const { paths, targetWidthMm, targetHeightMm } = args;
  const fillPercent = typeof args.fillPercent === 'number' ? args.fillPercent : 0.6;

  const warnings: string[] = [];

  if (paths.length === 0) {
    return {
      normalizedPathDs: [],
      localBounds: { xMm: 0, yMm: 0, widthMm: 0, heightMm: 0 },
      recommended: { scale: 1, xMm: targetWidthMm / 2, yMm: targetHeightMm / 2 },
      warnings: ['No paths to normalize'],
    };
  }

  let pathOps: Awaited<ReturnType<typeof loadPathOps>> | null = null;
  try {
    pathOps = await loadPathOps();
  } catch {
    warnings.push('PathOps not available; using approximate bounds');
  }

  const transformedDs: string[] = [];

  for (const p of paths) {
    const d = (p.d || '').trim();
    if (!d) continue;

    if (p.transform && pathOps) {
      const matrix = parseTransform(p.transform);
      if (matrix) {
        try {
          const path = pathOps.fromSVG(d);
          const tPath = pathOps.transform(path, matrix);
          const outD = pathOps.toSVG(tPath) || d;
          pathOps.deletePath(path);
          pathOps.deletePath(tPath);
          transformedDs.push(outD);
          continue;
        } catch {
          warnings.push('Failed to apply SVG transform; using raw path');
        }
      } else {
        warnings.push('Unparsed transform; using raw path');
      }
    } else if (p.transform && !pathOps) {
      warnings.push('Transform present but PathOps missing; using raw path');
    }

    transformedDs.push(d);
  }

  if (transformedDs.length === 0) {
    return {
      normalizedPathDs: [],
      localBounds: { xMm: 0, yMm: 0, widthMm: 0, heightMm: 0 },
      recommended: { scale: 1, xMm: targetWidthMm / 2, yMm: targetHeightMm / 2 },
      warnings: warnings.concat(['All extracted paths were empty']),
    };
  }

  // Compute bounds
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  if (pathOps) {
    for (const d of transformedDs) {
      const path = pathOps.fromSVG(d);
      const b = pathOps.getBounds(path);
      pathOps.deletePath(path);

      if (b.width <= 0 || b.height <= 0) continue;
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    // Fallback: regex bounds
    for (const d of transformedDs) {
      const nums = d.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
      if (!nums) continue;
      for (let i = 0; i + 1 < nums.length; i += 2) {
        const x = Number.parseFloat(nums[i]);
        const y = Number.parseFloat(nums[i + 1]);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return {
      normalizedPathDs: transformedDs,
      localBounds: { xMm: 0, yMm: 0, widthMm: 0, heightMm: 0 },
      recommended: { scale: 1, xMm: targetWidthMm / 2, yMm: targetHeightMm / 2 },
      warnings: warnings.concat(['Failed to compute bounds']),
    };
  }

  const w = Math.max(1e-6, maxX - minX);
  const h = Math.max(1e-6, maxY - minY);

  // Normalize to local origin (0,0) centered around (0,0)
  const cx = minX + w / 2;
  const cy = minY + h / 2;

  const targetW = targetWidthMm * fillPercent;
  const targetH = targetHeightMm * fillPercent;
  const scale = Math.min(targetW / w, targetH / h);

  const scaledCenteredDs: string[] = transformedDs.map((d) => {
    let idx = 0;
    return d.replace(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g, (match) => {
      const v = Number.parseFloat(match);
      const centered = idx % 2 === 0 ? (v - cx) : (v - cy);
      const out = centered * scale;
      idx++;
      return Number.isFinite(out) ? out.toFixed(3) : '0';
    });
  });

  return {
    normalizedPathDs: scaledCenteredDs,
    localBounds: { xMm: (-w * scale) / 2, yMm: (-h * scale) / 2, widthMm: w * scale, heightMm: h * scale },
    recommended: {
      scale: 1,
      xMm: targetWidthMm / 2,
      yMm: targetHeightMm / 2,
    },
    warnings,
  };
}
