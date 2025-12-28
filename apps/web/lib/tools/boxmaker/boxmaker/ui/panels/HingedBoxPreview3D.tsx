'use client';

import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { useMemo, useState, type FC } from 'react';
import * as THREE from 'three';
import type { HingedBoxSvgs, HingedInputs, Point2D } from '../../core/types';

type HingedBoxPreview3DProps = {
  input: HingedInputs;
  svgs: HingedBoxSvgs;
};

type LinePanelGeom = {
  geom: THREE.BufferGeometry;
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
};

type FilledPanelGeom = {
  fill: THREE.ExtrudeGeometry;
  line: THREE.BufferGeometry;
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
};

function bbox(points: Point2D[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

function parseSvgTemplate(svg: string): { d: string; tx: number; ty: number; rotDeg: number; rcx: number; rcy: number } | null {
  const dMatch = svg.match(/<path[^>]*\sd="([^"]+)"/);
  if (!dMatch) return null;

  const gMatch = svg.match(/<g[^>]*\stransform="([^"]+)"/);
  const transform = gMatch?.[1] ?? '';

  const tMatch = transform.match(/translate\(([-\d.]+)\s+([-\d.]+)\)/);
  const rMatch = transform.match(/rotate\(([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\)/);

  const tx = tMatch ? Number(tMatch[1]) : 0;
  const ty = tMatch ? Number(tMatch[2]) : 0;
  const rotDeg = rMatch ? Number(rMatch[1]) : 0;
  const rcx = rMatch ? Number(rMatch[2]) : 0;
  const rcy = rMatch ? Number(rMatch[3]) : 0;

  return { d: dMatch[1], tx, ty, rotDeg, rcx, rcy };
}

function rotatePt(p: Point2D, deg: number, cx: number, cy: number): Point2D {
  if (!deg) return p;
  const a = (deg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const x = p.x - cx;
  const y = p.y - cy;
  return { x: cx + x * cos - y * sin, y: cy + x * sin + y * cos };
}

function cubicAt(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

function pathToSegments(d: string): Array<[Point2D, Point2D]> {
  const segRe = /([MmLlHhVvCcZz])([^MmLlHhVvCcZz]*)/g;
  const readNumbers = (s: string) => {
    const nums = s.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
    return (nums ?? []).map((n) => Number(n));
  };

  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let hasMove = false;
  const out: Array<[Point2D, Point2D]> = [];

  let seg: RegExpExecArray | null;
  while ((seg = segRe.exec(d)) !== null) {
    const cmd = seg[1];
    const args = readNumbers(seg[2]);
    const isRel = cmd === cmd.toLowerCase();
    const c = cmd.toUpperCase();
    let i = 0;

    if (c === 'M') {
      if (i + 1 < args.length) {
        const nx = args[i++];
        const ny = args[i++];
        x = isRel ? x + nx : nx;
        y = isRel ? y + ny : ny;
        sx = x;
        sy = y;
        hasMove = true;
      }
      continue;
    }

    if (!hasMove) continue;

    if (c === 'L') {
      while (i + 1 < args.length) {
        const nx = args[i++];
        const ny = args[i++];
        const x2 = isRel ? x + nx : nx;
        const y2 = isRel ? y + ny : ny;
        out.push([{ x, y }, { x: x2, y: y2 }]);
        x = x2;
        y = y2;
      }
      continue;
    }

    if (c === 'H') {
      while (i < args.length) {
        const nx = args[i++];
        const x2 = isRel ? x + nx : nx;
        out.push([{ x, y }, { x: x2, y }]);
        x = x2;
      }
      continue;
    }

    if (c === 'V') {
      while (i < args.length) {
        const ny = args[i++];
        const y2 = isRel ? y + ny : ny;
        out.push([{ x, y }, { x, y: y2 }]);
        y = y2;
      }
      continue;
    }

    if (c === 'C') {
      while (i + 5 < args.length) {
        const x1 = args[i++];
        const y1 = args[i++];
        const x2 = args[i++];
        const y2 = args[i++];
        const x3 = args[i++];
        const y3 = args[i++];

        const p0 = { x, y };
        const p1 = { x: isRel ? x + x1 : x1, y: isRel ? y + y1 : y1 };
        const p2 = { x: isRel ? x + x2 : x2, y: isRel ? y + y2 : y2 };
        const p3 = { x: isRel ? x + x3 : x3, y: isRel ? y + y3 : y3 };

        const steps = 16;
        let prev = p0;
        for (let s = 1; s <= steps; s += 1) {
          const t = s / steps;
          const nx = cubicAt(p0.x, p1.x, p2.x, p3.x, t);
          const ny = cubicAt(p0.y, p1.y, p2.y, p3.y, t);
          const cur = { x: nx, y: ny };
          out.push([prev, cur]);
          prev = cur;
        }

        x = p3.x;
        y = p3.y;
      }
      continue;
    }

    if (c === 'Z') {
      out.push([{ x, y }, { x: sx, y: sy }]);
      x = sx;
      y = sy;
      continue;
    }
  }

  return out;
}

function createLinePanelFromSvg(svg: string, scale: number): LinePanelGeom | null {
  const parsed = parseSvgTemplate(svg);
  if (!parsed) return null;

  const segs = pathToSegments(parsed.d);
  if (segs.length === 0) return null;

  const pts: Point2D[] = [];
  for (const [a0, b0] of segs) {
    let a: Point2D = { x: a0.x + parsed.tx, y: a0.y + parsed.ty };
    let b: Point2D = { x: b0.x + parsed.tx, y: b0.y + parsed.ty };
    a = rotatePt(a, parsed.rotDeg, parsed.rcx + parsed.tx, parsed.rcy + parsed.ty);
    b = rotatePt(b, parsed.rotDeg, parsed.rcx + parsed.tx, parsed.rcy + parsed.ty);
    pts.push(a, b);
  }

  const bb = bbox(pts);
  const cx = (bb.minX + bb.maxX) / 2;
  const cy = (bb.minY + bb.maxY) / 2;

  const positions: number[] = [];
  for (const [a0, b0] of segs) {
    let a: Point2D = { x: a0.x + parsed.tx, y: a0.y + parsed.ty };
    let b: Point2D = { x: b0.x + parsed.tx, y: b0.y + parsed.ty };
    a = rotatePt(a, parsed.rotDeg, parsed.rcx + parsed.tx, parsed.rcy + parsed.ty);
    b = rotatePt(b, parsed.rotDeg, parsed.rcx + parsed.tx, parsed.rcy + parsed.ty);

    const ax = (a.x - cx) * scale;
    const ay = (-a.y + cy) * scale;
    const bx = (b.x - cx) * scale;
    const by = (-b.y + cy) * scale;
    positions.push(ax, ay, 0, bx, by, 0);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.computeBoundingSphere();
  return { geom, bbox: bb };
}

function polygonArea(points: Point2D[]): number {
  let a = 0;
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    const q = points[(i + 1) % points.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

function buildLoopsFromSegments(segments: Array<[Point2D, Point2D]>): Point2D[][] {
  const eps = 1e-3;
  const keyOf = (p: Point2D) => `${Math.round(p.x / eps) * eps},${Math.round(p.y / eps) * eps}`;
  const pointOfKey = (k: string): Point2D => {
    const [xs, ys] = k.split(',');
    return { x: Number(xs), y: Number(ys) };
  };

  const adj = new Map<string, Set<string>>();
  const edges: Array<[string, string]> = [];
  const edgeKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

  for (const [a0, b0] of segments) {
    const a = keyOf(a0);
    const b = keyOf(b0);
    if (a === b) continue;
    edges.push([a, b]);
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  }

  const used = new Set<string>();
  const loops: Point2D[][] = [];

  for (const [a, b] of edges) {
    const ek = edgeKey(a, b);
    if (used.has(ek)) continue;

    used.add(ek);
    const start = a;
    let prev = a;
    let curr = b;

    const loopKeys: string[] = [start, curr];
    let safety = 0;
    while (curr !== start && safety < 20000) {
      safety += 1;
      const neigh = adj.get(curr);
      if (!neigh || neigh.size === 0) break;

      let next: string | null = null;
      for (const n of neigh) {
        if (n !== prev) {
          next = n;
          break;
        }
      }
      if (!next) break;

      const ek2 = edgeKey(curr, next);
      if (used.has(ek2)) break;
      used.add(ek2);

      loopKeys.push(next);
      prev = curr;
      curr = next;
    }

    if (curr === start && loopKeys.length >= 4) {
      const pts = loopKeys.slice(0, -1).map(pointOfKey);
      loops.push(pts);
    }
  }

  return loops;
}

function createFilledPanelFromSvg(svg: string, scale: number, thicknessMm: number): FilledPanelGeom | null {
  const parsed = parseSvgTemplate(svg);
  if (!parsed) return null;

  const rawSegs = pathToSegments(parsed.d);
  if (rawSegs.length === 0) return null;

  const segs: Array<[Point2D, Point2D]> = rawSegs.map(([a0, b0]) => {
    let a: Point2D = { x: a0.x + parsed.tx, y: a0.y + parsed.ty };
    let b: Point2D = { x: b0.x + parsed.tx, y: b0.y + parsed.ty };
    a = rotatePt(a, parsed.rotDeg, parsed.rcx + parsed.tx, parsed.rcy + parsed.ty);
    b = rotatePt(b, parsed.rotDeg, parsed.rcx + parsed.tx, parsed.rcy + parsed.ty);
    return [a, b];
  });

  const allPts: Point2D[] = [];
  for (const [a, b] of segs) allPts.push(a, b);
  const bb = bbox(allPts);
  const cx = (bb.minX + bb.maxX) / 2;
  const cy = (bb.minY + bb.maxY) / 2;

  const loops = buildLoopsFromSegments(segs);
  if (loops.length === 0) return null;

  const normLoops = loops
    .map((lp) => lp.map((p) => ({ x: (p.x - cx) * scale, y: (-p.y + cy) * scale })))
    .filter((lp) => lp.length >= 3);
  if (normLoops.length === 0) return null;

  let outerIndex = 0;
  let outerAreaAbs = 0;
  for (let i = 0; i < normLoops.length; i += 1) {
    const a = Math.abs(polygonArea(normLoops[i]));
    if (a > outerAreaAbs) {
      outerAreaAbs = a;
      outerIndex = i;
    }
  }

  const outer = normLoops[outerIndex];
  const holes = normLoops.filter((_, i) => i !== outerIndex);

  const outerArea = polygonArea(outer);
  const outerFixed = outerArea < 0 ? [...outer].reverse() : outer;

  const shape = new THREE.Shape();
  shape.moveTo(outerFixed[0].x, outerFixed[0].y);
  for (let i = 1; i < outerFixed.length; i += 1) {
    shape.lineTo(outerFixed[i].x, outerFixed[i].y);
  }
  shape.closePath();

  for (const h0 of holes) {
    const a = polygonArea(h0);
    const hole = a > 0 ? [...h0].reverse() : h0;
    const path = new THREE.Path();
    path.moveTo(hole[0].x, hole[0].y);
    for (let i = 1; i < hole.length; i += 1) {
      path.lineTo(hole[i].x, hole[i].y);
    }
    path.closePath();
    shape.holes.push(path);
  }

  const depth = Math.max(thicknessMm * scale, 0.0001);
  const fill = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  fill.translate(0, 0, -depth / 2);
  fill.computeVertexNormals();

  const line = createLinePanelFromSvg(svg, scale)?.geom;
  if (!line) return null;

  return { fill, line, bbox: bb };
}

export const HingedBoxPreview3D: FC<HingedBoxPreview3DProps> = ({ input, svgs }) => {
  const [explode, setExplode] = useState(0);
  const [lidAngleDeg, setLidAngleDeg] = useState(25);

  const SCALE = 0.01;

  const tMm = Math.max(input.thicknessMm, 0.1);
  const tm = tMm * SCALE;

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#9aa4b2',
        roughness: 0.85,
        metalness: 0.05,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const lidMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#cbd5e1',
        roughness: 0.7,
        metalness: 0.05,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const lidAngleDegClamped = Math.max(0, Math.min(180, lidAngleDeg));
  const lidAngle = ((180 - lidAngleDegClamped) * Math.PI) / 180;

  const panelGeoms = useMemo(() => {
    const front = createFilledPanelFromSvg(svgs.front, SCALE, tMm);
    const back = createFilledPanelFromSvg(svgs.back, SCALE, tMm);
    const left = createFilledPanelFromSvg(svgs.left, SCALE, tMm);
    const right = createFilledPanelFromSvg(svgs.right, SCALE, tMm);
    const bottom = createFilledPanelFromSvg(svgs.bottom, SCALE, tMm);
    const lid = createFilledPanelFromSvg(svgs.lid, SCALE, tMm);
    if (!front || !back || !left || !right || !bottom || !lid) return null;

    const W = Math.max((bottom.bbox.maxX - bottom.bbox.minX) * SCALE, 0.01);
    const D = Math.max((bottom.bbox.maxY - bottom.bbox.minY) * SCALE, 0.01);
    const H = Math.max((front.bbox.maxY - front.bbox.minY) * SCALE, 0.01);

    return { front, back, left, right, bottom, lid, W, D, H };
  }, [SCALE, svgs, tMm]);

  if (!panelGeoms) {
    return (
      <div className="flex h-80 w-full items-center justify-center rounded-xl bg-white text-sm text-slate-600 md:h-[420px]">
        3D preview unavailable for current hinged geometry.
      </div>
    );
  }

  const Wm = panelGeoms.W;
  const Dm = panelGeoms.D;
  const Hm = panelGeoms.H;

  const diagonal = Math.max(Math.sqrt(Wm * Wm + Hm * Hm + Dm * Dm), 0.1);
  const cameraDistance = diagonal * 1.7;
  const explodeDist = diagonal * 0.35 * Math.max(0, Math.min(1, explode));

  const explodeOffset = (face: 'front' | 'back' | 'left' | 'right' | 'bottom' | 'lid'): [number, number, number] => {
    switch (face) {
      case 'front':
        return [0, 0, explodeDist];
      case 'back':
        return [0, 0, -explodeDist];
      case 'left':
        return [-explodeDist, 0, 0];
      case 'right':
        return [explodeDist, 0, 0];
      case 'bottom':
        return [0, -explodeDist, 0];
      case 'lid':
        return [0, explodeDist, 0];
      default:
        return [0, 0, 0];
    }
  };

  const halfT = tm / 2;

  // Place hinge axis at the top-back inner edge of the box (approx):
  // y = top surface + half thickness (lid thickness is centered), z = inner back plane.
  const hingeWorldPosFallback: [number, number, number] = [0, Hm / 2 + halfT - tm, -Dm / 2 + tm];

  const hingeFromHole: [number, number, number] | null = null;

  // Keep the user-requested visual alignment offsets for the lid assembly.
  // (forward +1 thickness, down -1 thickness)
  const lidPosOffset: [number, number, number] = [0, -tm, tm];

  const hingeWorldPos: [number, number, number] = hingeFromHole
    ? [hingeFromHole[0] + lidPosOffset[0], hingeFromHole[1] + lidPosOffset[1], hingeFromHole[2] + lidPosOffset[2]]
    : [hingeWorldPosFallback[0] + lidPosOffset[0], hingeWorldPosFallback[1] + lidPosOffset[1], hingeWorldPosFallback[2] + lidPosOffset[2]];

  const lidHingeOffsetLocalXY: [number, number, number] = [0, 0, 0];

  return (
    <div className="relative h-80 w-full overflow-hidden rounded-xl bg-white md:h-[420px]">
      <div className="absolute left-3 top-3 z-10 rounded bg-white/80 px-3 py-2 text-xs text-slate-900 shadow">
        <div className="flex flex-col gap-2">
          <label className="flex select-none items-center gap-2">
            <span className="whitespace-nowrap">Lid angle</span>
            <input
              type="range"
              min={0}
              max={180}
              step={1}
              value={lidAngleDeg}
              onChange={(e) => setLidAngleDeg(Number(e.target.value))}
            />
            <span className="tabular-nums">{Math.round(lidAngleDeg)}°</span>
          </label>
          <label className="flex select-none items-center gap-2">
            <span className="whitespace-nowrap">Explode</span>
            <input type="range" min={0} max={1} step={0.01} value={explode} onChange={(e) => setExplode(Number(e.target.value))} />
            <span className="tabular-nums">{Math.round(explode * 100)}%</span>
          </label>
        </div>
      </div>

      <Canvas camera={{ position: [cameraDistance, cameraDistance, cameraDistance], fov: 40 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />

        <group>
          <group position={[0, 0, Dm / 2 - halfT]}>
            <group position={explodeOffset('front')}>
              <mesh geometry={panelGeoms.front.fill} material={material} />
              <lineSegments geometry={panelGeoms.front.line}>
                <lineBasicMaterial color="#0f172a" />
              </lineSegments>
            </group>
          </group>

          <group position={[0, 0, -Dm / 2 + halfT]} rotation={[0, Math.PI, 0]}>
            <group position={explodeOffset('back')}>
              <mesh geometry={panelGeoms.back.fill} material={material} />
              <lineSegments geometry={panelGeoms.back.line}>
                <lineBasicMaterial color="#0f172a" />
              </lineSegments>
            </group>
          </group>

          <group position={[-Wm / 2 - halfT, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <group position={explodeOffset('left')}>
              <mesh geometry={panelGeoms.left.fill} material={material} />
              <lineSegments geometry={panelGeoms.left.line}>
                <lineBasicMaterial color="#0f172a" />
              </lineSegments>
            </group>
          </group>

          <group position={[Wm / 2 + halfT, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <group position={explodeOffset('right')}>
              <mesh geometry={panelGeoms.right.fill} material={material} />
              <lineSegments geometry={panelGeoms.right.line}>
                <lineBasicMaterial color="#0f172a" />
              </lineSegments>
            </group>
          </group>

          <group position={[0, -Hm / 2 - halfT, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <group position={explodeOffset('bottom')}>
              <mesh geometry={panelGeoms.bottom.fill} material={material} />
              <lineSegments geometry={panelGeoms.bottom.line}>
                <lineBasicMaterial color="#0f172a" />
              </lineSegments>
            </group>
          </group>

          <group position={hingeWorldPos}>
            <group rotation={[lidAngle, 0, 0]}>
              <group position={explodeOffset('lid')}>
                <group rotation={[Math.PI / 2, 0, 0]}>
                  <group position={lidHingeOffsetLocalXY}>
                    <mesh geometry={panelGeoms.lid.fill} material={lidMaterial} />
                    <lineSegments geometry={panelGeoms.lid.line}>
                      <lineBasicMaterial color="#0f172a" />
                    </lineSegments>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -Hm / 2 - tm * 2.5, 0]}>
          <planeGeometry args={[Wm * 3, Dm * 3]} />
          <meshStandardMaterial color="#0b1220" roughness={1} metalness={0} />
        </mesh>

        <OrbitControls enableDamping target={[0, 0, 0]} />

        <Html position={[0, Hm / 2 + tm * 6, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="rounded bg-black/40 px-2 py-1 text-[11px] text-slate-100">
            {Math.round(input.widthMm)} × {Math.round(input.depthMm)} × {Math.round(input.heightMm)} mm
          </div>
        </Html>
      </Canvas>
    </div>
  );
};
