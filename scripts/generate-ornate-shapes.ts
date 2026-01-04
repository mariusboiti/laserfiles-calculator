import fs from 'node:fs/promises';
import path from 'node:path';

type Token = { type: 'cmd'; value: string } | { type: 'num'; value: number; raw: string };

function tokenizePath(d: string): Token[] {
  const tokens: Token[] = [];
  const re = /([a-zA-Z])|([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    if (m[1]) {
      tokens.push({ type: 'cmd', value: m[1] });
    } else if (m[2]) {
      const raw = m[2];
      tokens.push({ type: 'num', value: Number(raw), raw });
    }
  }
  return tokens;
}

function isNum(t: Token | undefined): t is { type: 'num'; value: number; raw: string } {
  return !!t && t.type === 'num';
}

function updateBounds(min: { x: number; y: number }, max: { x: number; y: number }, x: number, y: number) {
  if (x < min.x) min.x = x;
  if (y < min.y) min.y = y;
  if (x > max.x) max.x = x;
  if (y > max.y) max.y = y;
}

function parseAndMeasureBounds(d: string): { minX: number; minY: number; maxX: number; maxY: number } {
  const tokens = tokenizePath(d);

  let i = 0;
  let cmd = '';

  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;

  let prevCubicX2: number | null = null;
  let prevCubicY2: number | null = null;
  let prevQuadX1: number | null = null;
  let prevQuadY1: number | null = null;
  let prevCmd = '';

  const min = { x: Infinity, y: Infinity };
  const max = { x: -Infinity, y: -Infinity };

  const readNum = () => {
    const t = tokens[i];
    if (!isNum(t)) throw new Error('Invalid path data');
    i++;
    return t.value;
  };

  const hasMoreNums = () => isNum(tokens[i]);

  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === 'cmd') {
      cmd = t.value;
      i++;
    } else if (!cmd) {
      throw new Error('Path data missing command');
    }

    const isRel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();

    const markPoint = (px: number, py: number) => updateBounds(min, max, px, py);

    const reflect = (cx: number, cy: number, px: number, py: number) => ({ x: 2 * cx - px, y: 2 * cy - py });

    if (C === 'M') {
      const x0 = readNum();
      const y0 = readNum();
      x = isRel ? x + x0 : x0;
      y = isRel ? y + y0 : y0;
      sx = x;
      sy = y;
      markPoint(x, y);
      prevCubicX2 = prevCubicY2 = prevQuadX1 = prevQuadY1 = null;

      while (hasMoreNums()) {
        const x1 = readNum();
        const y1 = readNum();
        x = isRel ? x + x1 : x1;
        y = isRel ? y + y1 : y1;
        markPoint(x, y);
      }
      prevCmd = cmd;
      continue;
    }

    if (C === 'Z') {
      x = sx;
      y = sy;
      markPoint(x, y);
      prevCubicX2 = prevCubicY2 = prevQuadX1 = prevQuadY1 = null;
      prevCmd = cmd;
      continue;
    }

    if (C === 'L') {
      while (hasMoreNums()) {
        const x1 = readNum();
        const y1 = readNum();
        x = isRel ? x + x1 : x1;
        y = isRel ? y + y1 : y1;
        markPoint(x, y);
      }
      prevCubicX2 = prevCubicY2 = prevQuadX1 = prevQuadY1 = null;
      prevCmd = cmd;
      continue;
    }

    if (C === 'H') {
      while (hasMoreNums()) {
        const dx = readNum();
        x = isRel ? x + dx : dx;
        markPoint(x, y);
      }
      prevCubicX2 = prevCubicY2 = prevQuadX1 = prevQuadY1 = null;
      prevCmd = cmd;
      continue;
    }

    if (C === 'V') {
      while (hasMoreNums()) {
        const dy = readNum();
        y = isRel ? y + dy : dy;
        markPoint(x, y);
      }
      prevCubicX2 = prevCubicY2 = prevQuadX1 = prevQuadY1 = null;
      prevCmd = cmd;
      continue;
    }

    if (C === 'C') {
      while (hasMoreNums()) {
        const x1 = readNum();
        const y1 = readNum();
        const x2 = readNum();
        const y2 = readNum();
        const x3 = readNum();
        const y3 = readNum();

        const ax1 = isRel ? x + x1 : x1;
        const ay1 = isRel ? y + y1 : y1;
        const ax2 = isRel ? x + x2 : x2;
        const ay2 = isRel ? y + y2 : y2;
        const ax3 = isRel ? x + x3 : x3;
        const ay3 = isRel ? y + y3 : y3;

        markPoint(ax1, ay1);
        markPoint(ax2, ay2);
        markPoint(ax3, ay3);

        x = ax3;
        y = ay3;
        prevCubicX2 = ax2;
        prevCubicY2 = ay2;
        prevQuadX1 = prevQuadY1 = null;
      }
      prevCmd = cmd;
      continue;
    }

    if (C === 'S') {
      while (hasMoreNums()) {
        const x2 = readNum();
        const y2 = readNum();
        const x3 = readNum();
        const y3 = readNum();

        const useReflect = prevCmd.toUpperCase() === 'C' || prevCmd.toUpperCase() === 'S';
        const r = useReflect && prevCubicX2 !== null && prevCubicY2 !== null ? reflect(x, y, prevCubicX2, prevCubicY2) : { x, y };

        const ax2 = isRel ? x + x2 : x2;
        const ay2 = isRel ? y + y2 : y2;
        const ax3 = isRel ? x + x3 : x3;
        const ay3 = isRel ? y + y3 : y3;

        markPoint(r.x, r.y);
        markPoint(ax2, ay2);
        markPoint(ax3, ay3);

        x = ax3;
        y = ay3;
        prevCubicX2 = ax2;
        prevCubicY2 = ay2;
        prevQuadX1 = prevQuadY1 = null;
        prevCmd = cmd;
      }
      continue;
    }

    if (C === 'Q') {
      while (hasMoreNums()) {
        const x1 = readNum();
        const y1 = readNum();
        const x2 = readNum();
        const y2 = readNum();

        const ax1 = isRel ? x + x1 : x1;
        const ay1 = isRel ? y + y1 : y1;
        const ax2 = isRel ? x + x2 : x2;
        const ay2 = isRel ? y + y2 : y2;

        markPoint(ax1, ay1);
        markPoint(ax2, ay2);

        x = ax2;
        y = ay2;
        prevQuadX1 = ax1;
        prevQuadY1 = ay1;
        prevCubicX2 = prevCubicY2 = null;
      }
      prevCmd = cmd;
      continue;
    }

    if (C === 'T') {
      while (hasMoreNums()) {
        const x2 = readNum();
        const y2 = readNum();

        const useReflect = prevCmd.toUpperCase() === 'Q' || prevCmd.toUpperCase() === 'T';
        const r = useReflect && prevQuadX1 !== null && prevQuadY1 !== null ? reflect(x, y, prevQuadX1, prevQuadY1) : { x, y };

        const ax2 = isRel ? x + x2 : x2;
        const ay2 = isRel ? y + y2 : y2;

        markPoint(r.x, r.y);
        markPoint(ax2, ay2);

        x = ax2;
        y = ay2;
        prevQuadX1 = r.x;
        prevQuadY1 = r.y;
        prevCubicX2 = prevCubicY2 = null;
        prevCmd = cmd;
      }
      continue;
    }

    if (C === 'A') {
      while (hasMoreNums()) {
        const rx = readNum();
        const ry = readNum();
        const rot = readNum();
        const laf = readNum();
        const sf = readNum();
        const x2 = readNum();
        const y2 = readNum();

        void rx;
        void ry;
        void rot;
        void laf;
        void sf;

        const ax2 = isRel ? x + x2 : x2;
        const ay2 = isRel ? y + y2 : y2;

        markPoint(ax2, ay2);

        x = ax2;
        y = ay2;
        prevCubicX2 = prevCubicY2 = prevQuadX1 = prevQuadY1 = null;
      }
      prevCmd = cmd;
      continue;
    }

    throw new Error(`Unsupported SVG path command: ${cmd}`);
  }

  if (!isFinite(min.x) || !isFinite(min.y) || !isFinite(max.x) || !isFinite(max.y)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  return { minX: min.x, minY: min.y, maxX: max.x, maxY: max.y };
}

function formatNum(n: number): string {
  const v = Math.round(n * 1000) / 1000;
  return Number.isInteger(v) ? String(v) : String(v);
}

function transformPathD(d: string, params: { scale: number; tx: number; ty: number; minX: number; minY: number }): string {
  const { scale, tx, ty, minX, minY } = params;
  const tokens = tokenizePath(d);

  let i = 0;
  let cmd = '';
  let out = '';

  const readNumRaw = () => {
    const t = tokens[i];
    if (!isNum(t)) throw new Error('Invalid path data');
    i++;
    return t.value;
  };

  const peekIsNum = () => isNum(tokens[i]);

  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === 'cmd') {
      cmd = t.value;
      out += cmd;
      i++;
    } else if (!cmd) {
      throw new Error('Path data missing command');
    }

    const isRel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();

    const write = (n: number) => {
      out += formatNum(n);
    };

    const writeSep = () => {
      const last = out[out.length - 1];
      if (last && last !== ' ' && last !== ',' && /[0-9.]/.test(last)) out += ' ';
    };

    const transformAbsX = (x: number) => (x - minX) * scale + tx;
    const transformAbsY = (y: number) => (y - minY) * scale + ty;
    const transformRel = (v: number) => v * scale;

    const writeXY = (x: number, y: number, abs: boolean) => {
      const nx = abs ? transformAbsX(x) : transformRel(x);
      const ny = abs ? transformAbsY(y) : transformRel(y);
      writeSep();
      write(nx);
      out += ' ';
      write(ny);
    };

    const writeX = (x: number, abs: boolean) => {
      const nx = abs ? transformAbsX(x) : transformRel(x);
      writeSep();
      write(nx);
    };

    const writeY = (y: number, abs: boolean) => {
      const ny = abs ? transformAbsY(y) : transformRel(y);
      writeSep();
      write(ny);
    };

    if (C === 'M' || C === 'L' || C === 'T') {
      while (peekIsNum()) {
        const x = readNumRaw();
        const y = readNumRaw();
        writeXY(x, y, !isRel);
      }
      continue;
    }

    if (C === 'H') {
      while (peekIsNum()) {
        const x = readNumRaw();
        writeX(x, !isRel);
      }
      continue;
    }

    if (C === 'V') {
      while (peekIsNum()) {
        const y = readNumRaw();
        writeY(y, !isRel);
      }
      continue;
    }

    if (C === 'C') {
      while (peekIsNum()) {
        const x1 = readNumRaw();
        const y1 = readNumRaw();
        const x2 = readNumRaw();
        const y2 = readNumRaw();
        const x = readNumRaw();
        const y = readNumRaw();
        writeXY(x1, y1, !isRel);
        out += ' ';
        writeXY(x2, y2, !isRel);
        out += ' ';
        writeXY(x, y, !isRel);
      }
      continue;
    }

    if (C === 'S' || C === 'Q') {
      const stride = C === 'S' ? 4 : 4;
      while (peekIsNum()) {
        const x1 = readNumRaw();
        const y1 = readNumRaw();
        const x = readNumRaw();
        const y = readNumRaw();
        void stride;
        writeXY(x1, y1, !isRel);
        out += ' ';
        writeXY(x, y, !isRel);
      }
      continue;
    }

    if (C === 'A') {
      while (peekIsNum()) {
        const rx = readNumRaw();
        const ry = readNumRaw();
        const rot = readNumRaw();
        const laf = readNumRaw();
        const sf = readNumRaw();
        const x = readNumRaw();
        const y = readNumRaw();

        const nrx = transformRel(rx);
        const nry = transformRel(ry);

        writeSep();
        write(nrx);
        out += ' ';
        write(nry);
        out += ' ';
        write(rot);
        out += ' ';
        write(laf);
        out += ' ';
        write(sf);
        out += ' ';
        writeXY(x, y, !isRel);
      }
      continue;
    }

    if (C === 'Z') {
      continue;
    }

    throw new Error(`Unsupported SVG path command: ${cmd}`);
  }

  return out.trim();
}

function extractPathsFromSvg(svg: string): string[] {
  const paths: string[] = [];
  const re = /<path\b[^>]*?\sd=("([^"]*)"|'([^']*)')[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg))) {
    const d = m[2] ?? m[3] ?? '';
    if (d.trim()) paths.push(d.trim());
  }
  return paths;
}

function extractViewBox(svg: string): { minX: number; minY: number; width: number; height: number } | null {
  const m = svg.match(/viewBox=("([^"]+)"|'([^']+)')/i);
  const vb = (m?.[2] ?? m?.[3] ?? '').trim();
  if (!vb) return null;
  const parts = vb.split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  return { minX: parts[0], minY: parts[1], width: parts[2], height: parts[3] };
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const assetsDir = path.join(
    repoRoot,
    'apps',
    'web',
    'lib',
    'tools',
    'personalised-sign-generator',
    'assets',
    'ornate-labels'
  );

  const outFile = path.join(
    repoRoot,
    'apps',
    'web',
    'lib',
    'tools',
    'personalised-sign-generator',
    'core',
    'shapes',
    'ornateLabels.ts'
  );

  const entries = await fs.readdir(assetsDir);
  const svgFiles = entries
    .filter((f) => f.toLowerCase().endsWith('.svg'))
    .filter((f) => !f.toLowerCase().includes('license'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const chosen = svgFiles.slice(0, 16);
  if (chosen.length < 16) {
    throw new Error(`Expected at least 16 SVGs in ${assetsDir}, found ${chosen.length}`);
  }

  const shapes: Array<{ id: string; label: string; sourceFile: string; pathD: string }> = [];

  for (let idx = 0; idx < chosen.length; idx++) {
    const file = chosen[idx];
    const svg = await fs.readFile(path.join(assetsDir, file), 'utf8');
    const paths = extractPathsFromSvg(svg);
    if (paths.length === 0) {
      throw new Error(`No <path d="..."> found in ${file}`);
    }

    const vb = extractViewBox(svg);
    void vb;

    const combined = paths.join(' ');
    const b = parseAndMeasureBounds(combined);
    const w = b.maxX - b.minX;
    const h = b.maxY - b.minY;
    if (!(w > 0) || !(h > 0)) {
      throw new Error(`Invalid bounds for ${file}`);
    }

    const scale = 100 / Math.max(w, h);
    const tx = (100 - w * scale) / 2;
    const ty = (100 - h * scale) / 2;

    const normalized = transformPathD(combined, { scale, tx, ty, minX: b.minX, minY: b.minY });

    const n = String(idx + 1).padStart(2, '0');
    shapes.push({
      id: `ornate-${n}`,
      label: `Ornate Label ${n}`,
      sourceFile: file,
      pathD: normalized,
    });
  }

  const content =
    `export type OrnateLabelId =\n` +
    shapes.map((s) => `  | '${s.id}'`).join('\n') +
    `;\n\n` +
    `export const ORNATE_LABELS: ReadonlyArray<{ id: OrnateLabelId; label: string; pathD: string }> = [\n` +
    shapes
      .map(
        (s) =>
          `  { id: '${s.id}', label: ${JSON.stringify(s.label)}, pathD: ${JSON.stringify(s.pathD)} },`
      )
      .join('\n') +
    `\n];\n\n` +
    `export function isOrnateLabelId(v: string): v is OrnateLabelId {\n` +
    `  return ORNATE_LABELS.some((s) => s.id === v);\n` +
    `}\n`;

  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, content, 'utf8');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
