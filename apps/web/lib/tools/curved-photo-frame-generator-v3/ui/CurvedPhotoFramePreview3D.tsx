/**
 * 3D Preview for Curved Photo Frame V3
 * Uses Three.js/React Three Fiber with gray material like box tools
 * Accurately represents the curved design with bend radius
 */

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Edges } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import type { CurvedPhotoFrameV3Result } from '../types';

interface CurvedPhotoFramePreview3DProps {
  result: CurvedPhotoFrameV3Result;
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

  // Calculate actual depth of curved section
  const curveDepth = useMemo(() => {
    // Arc depth calculation: depth = radius * (1 - cos(angle/2))
    // For a 90-degree bend: depth ≈ radius * 0.293
    return bendRadius * 0.4; // Approximate depth for visual representation
  }, [bendRadius]);

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

  // Viewing angle - frame tilted back like in product photo
  const viewingAngle = 75; // degrees from vertical
  const tiltRadians = ((90 - viewingAngle) * Math.PI) / 180;

  return (
    <div className="w-full h-[500px] bg-slate-950 rounded-lg border border-slate-800">
      <Canvas
        camera={{ position: [0, plateH * 0.8, plateW * 1.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={['#1a1a1a']} />
        
        {/* Lighting - soft and natural like product photo */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[plateW, plateH * 2, plateW * 2]} intensity={1.0} castShadow />
        <directionalLight position={[-plateW / 2, plateH, plateW]} intensity={0.3} />
        <spotLight position={[0, plateH * 1.5, plateW]} intensity={0.4} angle={0.6} penumbra={0.5} />

        {/* Complete frame assembly - tilted at viewing angle */}
        <group rotation={[tiltRadians, 0, 0]} position={[0, -plateH * 0.15, 0]}>
          {/* Front Plate - Curved with proper bend */}
          <CurvedFrontPlate
            width={plateW}
            height={plateH}
            thickness={t}
            bendRadius={bendRadius}
            curveDepth={curveDepth}
            bendZoneHeight={bendZoneHeightMm}
            supportLipHeight={supportLipHeightMm}
            material={plateMaterial}
          />

          {/* Side Supports - L-shaped brackets */}
          <SideSupport
            position={[-plateW / 2 - t / 2, 0, curveDepth / 2]}
            width={t}
            height={plateH}
            depth={curveDepth + supportLipHeightMm}
            material={standMaterial}
          />
          <SideSupport
            position={[plateW / 2 + t / 2, 0, curveDepth / 2]}
            width={t}
            height={plateH}
            depth={curveDepth + supportLipHeightMm}
            material={standMaterial}
          />

          {/* Back stand - triangular support */}
          <BackStand
            plateHeight={plateH}
            curveDepth={curveDepth}
            supportLipHeight={supportLipHeightMm}
            material={standMaterial}
            thickness={t}
          />
        </group>

        {/* Surface/table */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -plateH / 2 - 10, 0]} receiveShadow>
          <planeGeometry args={[plateW * 4, plateW * 4]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.9} metalness={0.1} />
        </mesh>

        <OrbitControls 
          enableDamping 
          target={[0, 0, 0]} 
          dampingFactor={0.05}
          rotateSpeed={0.5}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}

// Curved front plate component - accurately represents the bend
function CurvedFrontPlate({
  width,
  height,
  thickness,
  bendRadius,
  curveDepth,
  bendZoneHeight,
  supportLipHeight,
  material,
}: {
  width: number;
  height: number;
  thickness: number;
  bendRadius: number;
  curveDepth: number;
  bendZoneHeight: number;
  supportLipHeight: number;
  material: THREE.Material;
}) {
  const geometry = useMemo(() => {
    // Create curved geometry using ExtrudeGeometry for proper thickness
    const shape = new THREE.Shape();
    
    // Define the front plate outline
    shape.moveTo(-width / 2, -height / 2);
    shape.lineTo(width / 2, -height / 2);
    shape.lineTo(width / 2, height / 2);
    shape.lineTo(-width / 2, height / 2);
    shape.lineTo(-width / 2, -height / 2);

    // Extrude with custom curve path
    const segments = 48;
    const curvePoints: THREE.Vector3[] = [];
    
    // Create curve path that bends the plate
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = -height / 2 + t * height;
      
      // Calculate Z position based on Y (creates the curve)
      let z = 0;
      const normalizedY = t;
      
      // Photo zone stays flat (top portion)
      const photoZoneRatio = 0.6; // Top 60% is flat for photo
      const bendZoneRatio = 0.3;  // Next 30% bends
      const lipZoneRatio = 0.1;   // Bottom 10% is support lip
      
      if (normalizedY < photoZoneRatio) {
        // Photo zone - completely flat
        z = 0;
      } else if (normalizedY < photoZoneRatio + bendZoneRatio) {
        // Bend zone - smooth curve
        const bendProgress = (normalizedY - photoZoneRatio) / bendZoneRatio;
        // Use sine curve for smooth transition
        const angle = bendProgress * Math.PI / 2; // 0 to 90 degrees
        z = -curveDepth * Math.sin(angle);
      } else {
        // Support lip - continues at angle
        const lipProgress = (normalizedY - photoZoneRatio - bendZoneRatio) / lipZoneRatio;
        z = -curveDepth - lipProgress * curveDepth * 0.3;
      }
      
      curvePoints.push(new THREE.Vector3(0, y, z));
    }

    // Create curve from points
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    
    // Use PlaneGeometry and manually bend it
    const geo = new THREE.PlaneGeometry(width, height, 1, segments);
    const positions = geo.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const normalizedY = (y + height / 2) / height;
      
      // Apply same curve logic
      let z = 0;
      const photoZoneRatio = 0.6;
      const bendZoneRatio = 0.3;
      const lipZoneRatio = 0.1;
      
      if (normalizedY < photoZoneRatio) {
        z = 0;
      } else if (normalizedY < photoZoneRatio + bendZoneRatio) {
        const bendProgress = (normalizedY - photoZoneRatio) / bendZoneRatio;
        const angle = bendProgress * Math.PI / 2;
        z = -curveDepth * Math.sin(angle);
      } else {
        const lipProgress = (normalizedY - photoZoneRatio - bendZoneRatio) / lipZoneRatio;
        z = -curveDepth - lipProgress * curveDepth * 0.3;
      }
      
      positions.setZ(i, z);
    }

    positions.needsUpdate = true;
    geo.computeVertexNormals();

    return geo;
  }, [width, height, thickness, bendRadius, curveDepth, bendZoneHeight, supportLipHeight]);

  return (
    <mesh geometry={geometry} material={material} position={[0, 0, 0]}>
      <Edges scale={1.001} color="#0f172a" />
    </mesh>
  );
}

// Side support component - L-shaped bracket
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
    <group position={position}>
      {/* Vertical part */}
      <mesh position={[0, 0, -depth / 4]} material={material}>
        <boxGeometry args={[width, height, depth / 2]} />
        <Edges scale={1.001} color="#0f172a" />
      </mesh>
      {/* Horizontal base */}
      <mesh position={[0, -height / 2 + width / 2, depth / 4]} material={material}>
        <boxGeometry args={[width, width, depth / 2]} />
        <Edges scale={1.001} color="#0f172a" />
      </mesh>
    </group>
  );
}

// Back stand component - triangular support like in product photo
function BackStand({
  plateHeight,
  curveDepth,
  supportLipHeight,
  material,
  thickness,
}: {
  plateHeight: number;
  curveDepth: number;
  supportLipHeight: number;
  material: THREE.Material;
  thickness: number;
}) {
  const standHeight = plateHeight * 0.6; // Stand is about 60% of plate height
  const standDepth = curveDepth + supportLipHeight + plateHeight * 0.3;

  const geometry = useMemo(() => {
    // Create triangular stand shape
    const shape = new THREE.Shape();
    
    // Triangle points for side view of stand
    shape.moveTo(0, 0); // Bottom front
    shape.lineTo(0, standHeight); // Top front (attached to frame)
    shape.lineTo(-standDepth, 0); // Bottom back
    shape.lineTo(0, 0); // Close
    
    // Extrude to create thickness
    const extrudeSettings = {
      depth: thickness * 2,
      bevelEnabled: false,
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [standHeight, standDepth, thickness]);

  return (
    <mesh 
      geometry={geometry} 
      material={material}
      position={[0, -plateHeight / 2, -(curveDepth + supportLipHeight)]}
      rotation={[0, 0, 0]}
    >
      <Edges scale={1.001} color="#0f172a" />
    </mesh>
  );
}
