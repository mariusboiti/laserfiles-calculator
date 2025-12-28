/**
 * 3D Preview for Curved Photo Frame V2
 * Uses Three.js/React Three Fiber with gray material like box tools
 */

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Edges } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import type { CurvedPhotoFrameV2Result } from '../types';

interface CurvedPhotoFramePreview3DProps {
  result: CurvedPhotoFrameV2Result;
  photoWidthMm: number;
  photoHeightMm: number;
  borderMm: number;
  bendZoneHeightMm: number;
  supportLipHeightMm: number;
  curveStrength: string;
  materialThickness: number;
}

export function CurvedPhotoFramePreview3D({
  result,
  photoWidthMm,
  photoHeightMm,
  borderMm,
  bendZoneHeightMm,
  supportLipHeightMm,
  curveStrength,
  materialThickness,
}: CurvedPhotoFramePreview3DProps) {
  // Calculate dimensions
  const plateW = photoWidthMm + borderMm * 2;
  const plateH = photoHeightMm + borderMm * 2;
  const t = materialThickness;

  // Bend radius based on curve strength
  const bendRadius = useMemo(() => {
    if (curveStrength === 'strong') return bendZoneHeightMm * 0.8;
    if (curveStrength === 'medium') return bendZoneHeightMm * 1.2;
    return bendZoneHeightMm * 1.8; // gentle
  }, [curveStrength, bendZoneHeightMm]);

  // Materials - gray like box tools
  const plateMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#9aa4b2', // Same gray as box material
        roughness: 0.85,
        metalness: 0.05,
        side: THREE.DoubleSide,
      }),
    []
  );

  const standMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#cbd5e1', // Lighter gray for stands
        roughness: 0.7,
        metalness: 0.05,
        side: THREE.DoubleSide,
      }),
    []
  );

  return (
    <div className="w-full h-[500px] bg-slate-950 rounded-lg border border-slate-800">
      <Canvas
        camera={{ position: [plateW * 1.5, plateH * 1.2, plateW * 1.5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={['#0b1220']} />
        
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        <pointLight position={[0, plateH, plateW]} intensity={0.4} />

        {/* Front Plate - Curved */}
        <CurvedFrontPlate
          width={plateW}
          height={plateH}
          thickness={t}
          bendRadius={bendRadius}
          bendZoneHeight={bendZoneHeightMm}
          supportLipHeight={supportLipHeightMm}
          material={plateMaterial}
        />

        {/* Side Supports */}
        <SideSupport
          position={[-plateW / 2 - t / 2, 0, 0]}
          width={t}
          height={plateH}
          depth={bendRadius + supportLipHeightMm}
          material={standMaterial}
        />
        <SideSupport
          position={[plateW / 2 + t / 2, 0, 0]}
          width={t}
          height={plateH}
          depth={bendRadius + supportLipHeightMm}
          material={standMaterial}
        />

        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -plateH / 2 - 20, 0]}>
          <planeGeometry args={[plateW * 3, (bendRadius + supportLipHeightMm) * 3]} />
          <meshStandardMaterial color="#0b1220" roughness={1} metalness={0} />
        </mesh>

        <OrbitControls enableDamping target={[0, 0, 0]} />
      </Canvas>
    </div>
  );
}

// Curved front plate component
function CurvedFrontPlate({
  width,
  height,
  thickness,
  bendRadius,
  bendZoneHeight,
  supportLipHeight,
  material,
}: {
  width: number;
  height: number;
  thickness: number;
  bendRadius: number;
  bendZoneHeight: number;
  supportLipHeight: number;
  material: THREE.Material;
}) {
  const geometry = useMemo(() => {
    // Create curved geometry for front plate
    const segments = 32;
    const photoZoneHeight = height - bendZoneHeight - supportLipHeight;
    
    // Create shape for extrusion
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(width / 2, height);
    shape.lineTo(-width / 2, height);
    shape.lineTo(-width / 2, 0);

    // Create curved path
    const curve = new THREE.CurvePath<THREE.Vector3>();
    
    // Top flat section (photo zone)
    curve.add(
      new THREE.LineCurve3(
        new THREE.Vector3(0, height / 2 - bendZoneHeight / 2 - supportLipHeight / 2, 0),
        new THREE.Vector3(0, height / 2 - bendZoneHeight / 2 - supportLipHeight / 2, 0)
      )
    );

    // Create geometry manually for better control
    const geo = new THREE.PlaneGeometry(width, height, segments, segments);
    const positions = geo.attributes.position;

    // Apply curve to vertices
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      
      // Calculate normalized Y position (0 to 1)
      const normalizedY = (y + height / 2) / height;
      
      // Apply curve based on Y position
      let z = 0;
      if (normalizedY < photoZoneHeight / height) {
        // Photo zone - flat
        z = 0;
      } else if (normalizedY < (photoZoneHeight + bendZoneHeight) / height) {
        // Bend zone - curved
        const bendProgress = (normalizedY - photoZoneHeight / height) / (bendZoneHeight / height);
        const angle = bendProgress * Math.PI / 4; // 45 degree max bend
        z = -bendRadius * (1 - Math.cos(angle));
      } else {
        // Support lip - angled back
        const lipProgress = (normalizedY - (photoZoneHeight + bendZoneHeight) / height) / (supportLipHeight / height);
        const angle = Math.PI / 4;
        z = -bendRadius * (1 - Math.cos(angle)) - lipProgress * supportLipHeight * 0.5;
      }
      
      positions.setZ(i, z);
    }

    positions.needsUpdate = true;
    geo.computeVertexNormals();

    return geo;
  }, [width, height, thickness, bendRadius, bendZoneHeight, supportLipHeight]);

  return (
    <mesh geometry={geometry} material={material} position={[0, 0, 0]}>
      <Edges scale={1.001} color="#0f172a" />
    </mesh>
  );
}

// Side support component
function SideSupport({
  position,
  width,
  height,
  depth,
  material,
}: {
  position: [number, number, number];
  width: number;
  height: number;
  depth: number;
  material: THREE.Material;
}) {
  return (
    <mesh position={position} material={material}>
      <boxGeometry args={[width, height, depth]} />
      <Edges scale={1.001} color="#0f172a" />
    </mesh>
  );
}
