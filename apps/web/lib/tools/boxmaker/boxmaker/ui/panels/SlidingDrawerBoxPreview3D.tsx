'use client';

import { Canvas } from '@react-three/fiber';
import { Edges, OrbitControls } from '@react-three/drei';
import { useMemo, useState, type FC } from 'react';
import * as THREE from 'three';
import type { SlidingDrawerInputs, SlidingDrawerDrawerPanels, SlidingDrawerOuterPanels } from '../../core/types';
import { computeDrawerDimensions } from '../../core/sliding/drawerMath';

type SlidingDrawerBoxPreview3DProps = {
  input: SlidingDrawerInputs;
  panels: { outer: SlidingDrawerOuterPanels; drawer: SlidingDrawerDrawerPanels };
};

function bbox2(points: { x: number; y: number }[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
}

function panelToExtrudedGeometry(
  panel: { outline: { x: number; y: number }[]; cutouts?: { x: number; y: number }[][] },
  depth: number,
  scale: number,
  centerOverride?: { x: number; y: number },
): THREE.ExtrudeGeometry {
  const b = bbox2(panel.outline);
  const cx = centerOverride ? centerOverride.x : (b.minX + b.maxX) / 2;
  const cy = centerOverride ? centerOverride.y : (b.minY + b.maxY) / 2;

  const shape = new THREE.Shape();
  const pts = panel.outline;
  if (pts.length > 0) {
    shape.moveTo((pts[0].x - cx) * scale, (pts[0].y - cy) * scale);
    for (let i = 1; i < pts.length; i += 1) {
      shape.lineTo((pts[i].x - cx) * scale, (pts[i].y - cy) * scale);
    }
    shape.lineTo((pts[0].x - cx) * scale, (pts[0].y - cy) * scale);
  }

  if (panel.cutouts && panel.cutouts.length > 0) {
    for (const holePoly of panel.cutouts) {
      if (holePoly.length < 3) continue;
      const hole = new THREE.Path();
      hole.moveTo((holePoly[0].x - cx) * scale, (holePoly[0].y - cy) * scale);
      for (let i = 1; i < holePoly.length; i += 1) {
        hole.lineTo((holePoly[i].x - cx) * scale, (holePoly[i].y - cy) * scale);
      }
      hole.lineTo((holePoly[0].x - cx) * scale, (holePoly[0].y - cy) * scale);
      shape.holes.push(hole);
    }
  }

  const geom = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 });
  geom.translate(0, 0, -depth / 2);
  return geom;
}

type PanelMeshProps = {
  panel: { outline: { x: number; y: number }[]; cutouts?: { x: number; y: number }[][] };
  depth: number;
  scale: number;
  material: THREE.Material;
  position: [number, number, number];
  rotation: [number, number, number];
  edgeColor: string;
  centerOverride?: { x: number; y: number };
};

const PanelMesh: FC<PanelMeshProps> = ({ panel, depth, scale, material, position, rotation, edgeColor, centerOverride }) => {
  const key = useMemo(() => {
    const o = panel.outline.map((p) => `${p.x},${p.y}`).join(';');
    const c = (panel.cutouts ?? []).map((poly) => poly.map((p) => `${p.x},${p.y}`).join(';')).join('|');
    return `${o}__${c}`;
  }, [panel]);

  const geometry = useMemo(() => panelToExtrudedGeometry(panel, depth, scale, centerOverride), [key, depth, scale, centerOverride]);

  return (
    <mesh geometry={geometry} material={material} position={position} rotation={rotation}>
      <Edges color={edgeColor} />
    </mesh>
  );
};

export const SlidingDrawerBoxPreview3D: FC<SlidingDrawerBoxPreview3DProps> = ({ input, panels }) => {
  const [explode, setExplode] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(0.4);

  const dims = useMemo(() => computeDrawerDimensions(input), [input]);

  const SCALE = 0.01;
  const Wm = Math.max(dims.outerWidth, 1) * SCALE;
  const Dm = Math.max(dims.outerDepth, 1) * SCALE;
  const Hm = Math.max(dims.outerHeight, 1) * SCALE;

  const dWm = Math.max(dims.drawerWidth, 1) * SCALE;
  const dDm = Math.max(dims.drawerDepth, 1) * SCALE;
  const dHm = Math.max(dims.drawerHeight, 1) * SCALE;

  const diagonal = Math.max(Math.sqrt(Wm * Wm + Hm * Hm + Dm * Dm), 0.1);
  const cameraDistance = diagonal * 1.7;

  const explodeDist = diagonal * 0.25 * Math.max(0, Math.min(1, explode));
  const drawerOpenClamped = Math.max(0, Math.min(1, drawerOpen));

  const tm = Math.max(input.thicknessMm, 0.1) * SCALE;
  const clearanceM = Math.max(input.drawerClearanceMm, 0) * SCALE;
  const bottomOffsetM = Math.max(input.drawerBottomOffsetMm, 0) * SCALE;

  const outerMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        roughness: 0.85,
        metalness: 0.05,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const drawerMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#cbd5e1',
        roughness: 0.7,
        metalness: 0.05,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const drawerCenterY = -Hm / 2 + tm + bottomOffsetM + clearanceM + dHm / 2;
  const drawerCenterZClosed = -Dm / 2 + tm + clearanceM / 2 + dDm / 2;
  const drawerTravel = Dm * 0.65;
  const drawerCenterZ = drawerCenterZClosed + drawerOpenClamped * drawerTravel + explodeDist;

  return (
    <div className="relative h-80 w-full overflow-hidden rounded-xl bg-white md:h-[420px]">
      <div className="absolute left-3 top-3 z-10 rounded bg-white/80 px-3 py-2 text-xs text-slate-900 shadow">
        <div className="flex flex-col gap-2">
          <label className="flex select-none items-center gap-2">
            <span className="whitespace-nowrap">Drawer open</span>
            <input type="range" min={0} max={1} step={0.01} value={drawerOpen} onChange={(e) => setDrawerOpen(Number(e.target.value))} />
            <span className="tabular-nums">{Math.round(drawerOpenClamped * 100)}%</span>
          </label>
          <label className="flex select-none items-center gap-2">
            <span className="whitespace-nowrap">Explode</span>
            <input type="range" min={0} max={1} step={0.01} value={explode} onChange={(e) => setExplode(Number(e.target.value))} />
            <span className="tabular-nums">{Math.round(explodeDist * 1000) / 10}</span>
          </label>
        </div>
      </div>

      <Canvas camera={{ position: [cameraDistance, cameraDistance, cameraDistance], fov: 40 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />

        <group>
          <group>
            <PanelMesh
              panel={panels.outer.back}
              depth={tm}
              scale={SCALE}
              material={outerMaterial}
              position={[0, 0, -Dm / 2 + tm / 2 - explodeDist]}
              rotation={[0, 0, 0]}
              edgeColor="#0f172a"
              centerOverride={{ x: dims.outerWidth / 2, y: dims.outerHeight / 2 }}
            />
            <PanelMesh
              panel={panels.outer.left}
              depth={tm}
              scale={SCALE}
              material={outerMaterial}
              position={[-Wm / 2 + tm / 2 - explodeDist, 0, 0]}
              rotation={[0, -Math.PI / 2, 0]}
              edgeColor="#0f172a"
              centerOverride={{ x: dims.outerDepth / 2, y: dims.outerHeight / 2 }}
            />
            <PanelMesh
              panel={panels.outer.right}
              depth={tm}
              scale={SCALE}
              material={outerMaterial}
              position={[Wm / 2 - tm / 2 + explodeDist, 0, 0]}
              rotation={[0, -Math.PI / 2, 0]}
              edgeColor="#0f172a"
              centerOverride={{ x: dims.outerDepth / 2, y: dims.outerHeight / 2 }}
            />
            <PanelMesh
              panel={panels.outer.bottom}
              depth={tm}
              scale={SCALE}
              material={outerMaterial}
              position={[0, -Hm / 2 + tm / 2 - explodeDist, 0]}
              rotation={[Math.PI / 2, 0, 0]}
              edgeColor="#0f172a"
              centerOverride={{ x: dims.outerWidth / 2, y: dims.outerDepth / 2 }}
            />
            {panels.outer.top ? (
              <PanelMesh
                panel={panels.outer.top}
                depth={tm}
                scale={SCALE}
                material={outerMaterial}
                position={[0, Hm / 2 - tm / 2 + explodeDist, -tm]}
                rotation={[-Math.PI / 2, 0, 0]}
                edgeColor="#0f172a"
                centerOverride={{ x: dims.outerWidth / 2, y: dims.outerDepth / 2 }}
              />
            ) : null}
          </group>

          <group position={[0, drawerCenterY + explodeDist * 0.15, drawerCenterZ]}>
            <PanelMesh
              panel={panels.drawer.back}
              depth={tm}
              scale={SCALE}
              material={drawerMaterial}
              position={[0, 0, -dDm / 2 + tm / 2]}
              rotation={[0, Math.PI, 0]}
              edgeColor="#0f172a"
              centerOverride={{ x: dims.drawerWidth / 2, y: dims.drawerHeight / 2 }}
            />
            <PanelMesh
              panel={panels.drawer.front}
              depth={tm}
              scale={SCALE}
              material={drawerMaterial}
              position={[0, 0, dDm / 2 - tm / 2]}
              rotation={[0, 0, 0]}
              edgeColor="#0f172a"
              centerOverride={{ x: dims.drawerWidth / 2, y: dims.drawerHeight / 2 }}
            />
            <PanelMesh
              panel={panels.drawer.left}
              depth={tm}
              scale={SCALE}
              material={drawerMaterial}
              position={[-dWm / 2 + tm / 2, 0, 0]}
              rotation={[0, -Math.PI / 2, 0]}
              edgeColor="#0f172a"
              centerOverride={{ x: dims.drawerDepth / 2, y: dims.drawerHeight / 2 }}
            />
            <PanelMesh
              panel={panels.drawer.right}
              depth={tm}
              scale={SCALE}
              material={drawerMaterial}
              position={[dWm / 2 - tm / 2, 0, 0]}
              rotation={[0, Math.PI / 2, 0]}
              edgeColor="#0f172a"
              centerOverride={{ x: dims.drawerDepth / 2, y: dims.drawerHeight / 2 }}
            />
            <PanelMesh
              panel={panels.drawer.bottom}
              depth={tm}
              scale={SCALE}
              material={drawerMaterial}
              position={[0, -dHm / 2 + tm / 2, 0]}
              rotation={[Math.PI / 2, 0, 0]}
              edgeColor="#0f172a"
              centerOverride={{ x: dims.drawerWidth / 2, y: dims.drawerDepth / 2 }}
            />
          </group>
        </group>

        <OrbitControls enableDamping />
      </Canvas>
    </div>
  );
};
