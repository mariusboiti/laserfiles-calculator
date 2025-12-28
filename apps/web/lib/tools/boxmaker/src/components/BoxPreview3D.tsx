import { Canvas } from '@react-three/fiber'
import { Edges, Html, OrbitControls } from '@react-three/drei'
import type { FC } from 'react'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import type { BoxSettings, FaceName, GeneratedFace, ImportedItem } from '../lib/types'
import { getBoxOuterDimensions } from '../lib/boxGenerator'

type BoxPreview3DProps = {
  settings: BoxSettings
  faces: GeneratedFace[] | null
  importedItems: ImportedItem[]
  lidRotationOffset?: [number, number, number]
  lidPositionOffsetMm?: [number, number, number]
}

type FaceTransform = {
  position: [number, number, number]
  rotation: [number, number, number]
}

function buildImportedItemSvg(item: ImportedItem): string {
  const w = Math.max(item.face.width, 1)
  const h = Math.max(item.face.height, 1)
  const ox = item.face.offset?.x ?? 0
  const oy = item.face.offset?.y ?? 0

  const parts: string[] = []
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">`)
  parts.push(`<g transform="translate(${ox} ${oy})">`)

  for (const p of item.face.paths) {
    const stroke = p.op === 'cut' ? '#ff0000' : p.op === 'score' ? '#0000ff' : 'none'
    const fill = p.op === 'engrave' ? '#000000' : 'none'
    const strokeWidth = p.op === 'engrave' ? 0 : 1
    parts.push(
      `<path d="${p.d}" stroke="${stroke}" fill="${fill}" stroke-width="${strokeWidth}" vector-effect="non-scaling-stroke" />`,
    )
  }

  parts.push('</g>')
  parts.push('</svg>')
  return parts.join('')
}

function ImportedItemOverlay(props: {
  item: ImportedItem
  face: GeneratedFace
  scale: number
  surfaceOffset: number
}) {
  const { item, face, scale, surfaceOffset } = props
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    if (typeof document === 'undefined') return

    const svg = buildImportedItemSvg(item)
    const wMm = Math.max(item.face.width, 1)
    const hMm = Math.max(item.face.height, 1)

    const pxPerMm = 4
    const maxSize = 1024
    const canvasW = Math.max(64, Math.min(maxSize, Math.round(wMm * pxPerMm)))
    const canvasH = Math.max(64, Math.min(maxSize, Math.round(hMm * pxPerMm)))

    const canvas = document.createElement('canvas')
    canvas.width = canvasW
    canvas.height = canvasH
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvasW, canvasH)
    ctx.fillStyle = 'rgba(0,0,0,0)'
    ctx.fillRect(0, 0, canvasW, canvasH)

    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const img = new Image()

    let alive = true

    img.onload = () => {
      if (!alive) return
      ctx.drawImage(img, 0, 0, canvasW, canvasH)
      const tex = new THREE.CanvasTexture(canvas)
      tex.colorSpace = THREE.SRGBColorSpace
      tex.flipY = true
      tex.needsUpdate = true
      tex.minFilter = THREE.LinearMipmapLinearFilter
      tex.magFilter = THREE.LinearFilter
      setTexture((prev) => {
        if (prev) prev.dispose()
        return tex
      })
      try {
        URL.revokeObjectURL(url)
      } catch {
        // ignore
      }
    }

    img.onerror = () => {
      try {
        URL.revokeObjectURL(url)
      } catch {
        // ignore
      }
    }

    img.src = url

    return () => {
      alive = false
      setTexture((prev) => {
        if (prev) prev.dispose()
        return null
      })
      try {
        URL.revokeObjectURL(url)
      } catch {
        // ignore
      }
    }
  }, [item])

  const place = item.placement
  if (!place.faceId) return null
  if (place.faceId !== face.id) return null

  const w = item.face.width * Math.max(place.scale, 0.01)
  const h = item.face.height * Math.max(place.scale, 0.01)

  const x = (place.x - face.width / 2) * scale
  const y = (face.height / 2 - place.y) * scale
  const rot = -place.rotation

  return (
    <group position={[x, y, surfaceOffset]} rotation={[0, 0, rot]}>
      <mesh>
        <planeGeometry args={[Math.max(w * scale, 0.001), Math.max(h * scale, 0.001)]} />
        <meshBasicMaterial
          map={texture ?? undefined}
          color={texture ? '#ffffff' : '#111827'}
          transparent
          opacity={texture ? 1 : 0.35}
          side={THREE.DoubleSide}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
    </group>
  )
}

function createFaceGeometry(face: GeneratedFace, thicknessMm: number, scale: number): THREE.ExtrudeGeometry | null {
  const verts = face.vertices
  if (!verts || verts.length < 3) return null

  const tryParseCircle = (d: string): { cx: number; cy: number; r: number } | null => {
    const m = d.match(
      /^\s*M\s*([+-]?[0-9]*\.?[0-9]+)\s+([+-]?[0-9]*\.?[0-9]+)\s+A\s*([+-]?[0-9]*\.?[0-9]+)\s+([+-]?[0-9]*\.?[0-9]+)\s+0\s+1\s+0\s+([+-]?[0-9]*\.?[0-9]+)\s+([+-]?[0-9]*\.?[0-9]+)\s+A\s*([+-]?[0-9]*\.?[0-9]+)\s+([+-]?[0-9]*\.?[0-9]+)\s+0\s+1\s+0\s+([+-]?[0-9]*\.?[0-9]+)\s+([+-]?[0-9]*\.?[0-9]+)\s+Z\s*$/i,
    )
    if (!m) return null
    const x1 = Number(m[1])
    const y1 = Number(m[2])
    const x2 = Number(m[5])
    const y2 = Number(m[6])
    const r1 = Number(m[3])
    if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(x2) || !Number.isFinite(y2) || !Number.isFinite(r1)) return null
    const cx = (x1 + x2) / 2
    const cy = (y1 + y2) / 2
    const r = Math.max(Math.abs(r1), 0)
    if (r <= 0) return null
    return { cx, cy, r }
  }

  const shape = new THREE.Shape()
  const first = verts[0]
  shape.moveTo(first.x * scale, first.y * scale)
  for (let i = 1; i < verts.length; i += 1) {
    const p = verts[i]
    shape.lineTo(p.x * scale, p.y * scale)
  }
  shape.closePath()

  for (const p of face.paths ?? []) {
    if (p.op !== 'cut') continue
    const c = tryParseCircle(p.d)
    if (!c) continue
    const hole = new THREE.Path()
    hole.absellipse(c.cx * scale, c.cy * scale, c.r * scale, c.r * scale, 0, Math.PI * 2, false, 0)
    shape.holes.push(hole)
  }

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: thicknessMm * scale,
    bevelEnabled: false,
  })

  geom.computeBoundingBox()
  const bbox = geom.boundingBox
  if (bbox) {
    const center = new THREE.Vector3()
    bbox.getCenter(center)
    geom.translate(-center.x, -center.y, -center.z)
  }
  geom.computeVertexNormals()

  return geom
}

function getFaceTransform(faceName: FaceName, W: number, H: number, D: number, t: number): FaceTransform {
  switch (faceName) {
    case 'front':
      return { position: [0, 0, D / 2 - t / 2], rotation: [0, 0, 0] }
    case 'back':
      return { position: [0, 0, -D / 2 + t / 2], rotation: [0, Math.PI, 0] }
    case 'left':
      return { position: [-W / 2 + t / 2, 0, 0], rotation: [0, -Math.PI / 2, 0] }
    case 'right':
      return { position: [W / 2 - t / 2, 0, 0], rotation: [0, Math.PI / 2, 0] }
    case 'bottom':
      return { position: [0, -H / 2 + t / 2, 0], rotation: [Math.PI / 2, 0, 0] }
    case 'top':
      return { position: [0, H / 2 - t / 2, 0], rotation: [-Math.PI / 2, 0, 0] }
    default:
      return { position: [0, 0, 0], rotation: [0, 0, 0] }
  }
}

export const BoxPreview3D: FC<BoxPreview3DProps> = ({
  settings,
  faces,
  importedItems,
  lidRotationOffset,
  lidPositionOffsetMm,
}) => {
  const [hideLid, setHideLid] = useState(false)
  const [explode, setExplode] = useState(0)

  const dims = useMemo(() => {
    try {
      return getBoxOuterDimensions(settings)
    } catch {
      return null
    }
  }, [settings])

  const extrudeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#9aa4b2',
        roughness: 0.85,
        metalness: 0.05,
        side: THREE.DoubleSide,
      }),
    [],
  )
  const lidMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#cbd5e1',
        roughness: 0.7,
        metalness: 0.05,
        side: THREE.DoubleSide,
      }),
    [],
  )

  const outerWidth = dims?.outerWidth ?? 0
  const outerHeight = dims?.outerHeight ?? 0
  const outerDepth = dims?.outerDepth ?? 0
  const lidType = settings.lidType ?? 'none'

  const tMm = Math.max(settings.materialThickness ?? 3, 0.1)

  const errorMessage =
    !dims
      ? '3D preview unavailable for current settings.'
      : outerWidth <= 0 || outerHeight <= 0 || outerDepth <= 0
        ? 'Enter valid dimensions to see the 3D preview.'
        : null

  const SCALE = 0.01
  const W = outerWidth > 0 ? outerWidth * SCALE : 1
  const H = outerHeight > 0 ? outerHeight * SCALE : 1
  const D = outerDepth > 0 ? outerDepth * SCALE : 1
  const t = tMm * SCALE

  const lidRotOff: [number, number, number] = lidRotationOffset ?? [0, 0, 0]
  const lidPosOff: [number, number, number] = lidPositionOffsetMm ?? [0, 0, 0]

  const bodyOuterHeightMm = lidType === 'none' ? outerHeight : Math.max(outerHeight - tMm, 0.1)
  const HB = bodyOuterHeightMm * SCALE

  const diagonal = Math.max(Math.sqrt(W * W + H * H + D * D), 0.1)
  const cameraDistance = diagonal * 1.6

  const explodeDist = diagonal * 0.35 * Math.max(0, Math.min(1, explode))

  const explodeOffset = (faceName: FaceName): [number, number, number] => {
    switch (faceName) {
      case 'front':
        return [0, 0, explodeDist]
      case 'back':
        return [0, 0, -explodeDist]
      case 'left':
        return [-explodeDist, 0, 0]
      case 'right':
        return [explodeDist, 0, 0]
      case 'bottom':
        return [0, -explodeDist, 0]
      case 'top':
        return [0, explodeDist, 0]
      case 'lid':
        return [0, explodeDist, 0]
      default:
        return [0, 0, 0]
    }
  }

  const lidDepthMultiplier = lidType === 'sliding_lid' ? 1.05 : 1

  const innerW = Math.max(W - 2 * t, 0.05)
  const innerD = Math.max(D - 2 * t, 0.05)
  const wallH = Math.max(H - t, 0.05)

  const dividerCompX = Math.max(1, Math.floor(settings.dividerCountX ?? 1))
  const dividerCompZ = Math.max(1, Math.floor(settings.dividerCountZ ?? 1))
  const dividerCountX = settings.dividersEnabled ? Math.max(0, dividerCompX - 1) : 0
  const dividerCountZ = settings.dividersEnabled ? Math.max(0, dividerCompZ - 1) : 0

  const extrudedFaces = useMemo(() => {
    if (errorMessage) return null
    if (!faces || faces.length === 0) return null

    const relevant = faces.filter((face) => {
      if (!face.vertices || face.vertices.length < 3) return false
      if (face.name === 'front') return true
      if (face.name === 'back') return true
      if (face.name === 'left') return true
      if (face.name === 'right') return true
      if (face.name === 'bottom') return true
      if (face.name === 'top') return true
      if (!hideLid && face.name === 'lid') return true
      return false
    })

    if (relevant.length === 0) return null

    return relevant
      .map((face) => {
        const geom = createFaceGeometry(face, tMm, SCALE)
        if (!geom) return null

        const transform =
          face.name === 'lid'
            ? {
                position: [
                  0 + lidPosOff[0] * SCALE,
                  HB / 2 + t / 2 + lidPosOff[1] * SCALE,
                  0 + lidPosOff[2] * SCALE,
                ] as const,
                rotation: [
                  -Math.PI / 2 + lidRotOff[0],
                  0 + lidRotOff[1],
                  0 + lidRotOff[2],
                ] as const,
              }
            : getFaceTransform(face.name, W, HB, D, t)

        return {
          face,
          geom,
          transform,
        }
      })
      .filter((x): x is { face: GeneratedFace; geom: THREE.ExtrudeGeometry; transform: FaceTransform } => x !== null)
  }, [D, HB, H, W, errorMessage, faces, hideLid, lidPosOff, lidRotOff, t, tMm])

  const importedByFaceId = useMemo(() => {
    const map = new Map<string, ImportedItem[]>()
    for (const item of importedItems ?? []) {
      const faceId = item.placement.faceId
      if (!faceId) continue
      const list = map.get(faceId) ?? []
      list.push(item)
      map.set(faceId, list)
    }
    return map
  }, [importedItems])

  if (errorMessage) {
    return (
      <div className="flex h-80 w-full items-center justify-center rounded-xl bg-white text-sm text-slate-600 md:h-[420px]">
        {errorMessage}
      </div>
    )
  }

  return (
    <div className="relative h-80 w-full overflow-hidden rounded-xl bg-white md:h-[420px]">
      <div className="absolute left-3 top-3 z-10 rounded bg-white/80 px-3 py-2 text-xs text-slate-900 shadow">
        <div className="flex flex-col gap-2">
          {lidType !== 'none' ? (
            <label className="flex select-none items-center gap-2">
              <input type="checkbox" checked={hideLid} onChange={(e) => setHideLid(e.target.checked)} />
              Hide lid
            </label>
          ) : null}
          <label className="flex select-none items-center gap-2">
            <span className="whitespace-nowrap">Explode</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={explode}
              onChange={(e) => setExplode(Number(e.target.value))}
            />
            <span className="tabular-nums">{Math.round(explode * 100)}%</span>
          </label>
        </div>
      </div>

      <Canvas camera={{ position: [cameraDistance, cameraDistance, cameraDistance], fov: 40 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />

        {extrudedFaces ? (
          <group>
            {extrudedFaces.map(({ face, geom, transform }) => (
              <group
                key={face.id}
                position={(() => {
                  const off = explodeOffset(face.name)
                  return [transform.position[0] + off[0], transform.position[1] + off[1], transform.position[2] + off[2]] as const
                })()}
                rotation={transform.rotation}
              >
                <mesh geometry={geom} material={face.name === 'lid' ? lidMaterial : extrudeMaterial}>
                  <Edges scale={1.001} color="#0f172a" />
                </mesh>
                {importedByFaceId.get(face.id)?.length ? (
                  <group>
                    {importedByFaceId.get(face.id)!.map((item) => (
                      <ImportedItemOverlay key={item.id} item={item} face={face} scale={SCALE} surfaceOffset={t / 2 + 0.0002} />
                    ))}
                  </group>
                ) : null}
              </group>
            ))}

            {dividerCountX > 0 || dividerCountZ > 0 ? (
              <group>
                {dividerCountX > 0
                  ? Array.from({ length: dividerCountX }).map((_, idx) => {
                      const step = innerW / dividerCompX
                      const x = -innerW / 2 + (idx + 1) * step
                      const h = Math.max(HB - t, 0.02)
                      return (
                        <mesh key={`divider-x-${idx}`} position={[x, t / 2, 0]}>
                          <boxGeometry args={[t, h, innerD]} />
                          <meshStandardMaterial color="#9aa4b2" roughness={0.85} metalness={0.05} side={THREE.DoubleSide} />
                          <Edges scale={1.001} color="#0f172a" />
                        </mesh>
                      )
                    })
                  : null}
                {dividerCountZ > 0
                  ? Array.from({ length: dividerCountZ }).map((_, idx) => {
                      const step = innerD / dividerCompZ
                      const z = -innerD / 2 + (idx + 1) * step
                      const h = Math.max(HB - t, 0.02)
                      return (
                        <mesh key={`divider-z-${idx}`} position={[0, t / 2, z]}>
                          <boxGeometry args={[innerW, h, t]} />
                          <meshStandardMaterial color="#9aa4b2" roughness={0.85} metalness={0.05} side={THREE.DoubleSide} />
                          <Edges scale={1.001} color="#0f172a" />
                        </mesh>
                      )
                    })
                  : null}
              </group>
            ) : null}
          </group>
        ) : (
          <group>
            <mesh position={[0, t / 2 - explodeDist, 0]}>
              <boxGeometry args={[W, t, D]} />
              <meshStandardMaterial color="#9aa4b2" roughness={0.85} metalness={0.05} />
              <Edges scale={1.001} color="#0f172a" />
            </mesh>

            <mesh position={[-(W / 2 - t / 2) - explodeDist, t + wallH / 2, 0]}>
              <boxGeometry args={[t, wallH, innerD]} />
              <meshStandardMaterial color="#9aa4b2" roughness={0.85} metalness={0.05} />
              <Edges scale={1.001} color="#0f172a" />
            </mesh>
            <mesh position={[W / 2 - t / 2 + explodeDist, t + wallH / 2, 0]}>
              <boxGeometry args={[t, wallH, innerD]} />
              <meshStandardMaterial color="#9aa4b2" roughness={0.85} metalness={0.05} />
              <Edges scale={1.001} color="#0f172a" />
            </mesh>

            <mesh position={[0, t + wallH / 2, D / 2 - t / 2 + explodeDist]}>
              <boxGeometry args={[innerW, wallH, t]} />
              <meshStandardMaterial color="#9aa4b2" roughness={0.85} metalness={0.05} />
              <Edges scale={1.001} color="#0f172a" />
            </mesh>
            <mesh position={[0, t + wallH / 2, -(D / 2 - t / 2) - explodeDist]}>
              <boxGeometry args={[innerW, wallH, t]} />
              <meshStandardMaterial color="#9aa4b2" roughness={0.85} metalness={0.05} />
              <Edges scale={1.001} color="#0f172a" />
            </mesh>

            {lidType !== 'none' && !hideLid ? (
              <mesh position={[0, H + t / 2 + explodeDist, 0]}>
                <boxGeometry
                  args={[
                    lidType === 'sliding_lid' ? innerW : W,
                    t,
                    (lidType === 'sliding_lid' ? innerD : D) * lidDepthMultiplier,
                  ]}
                />
                <meshStandardMaterial color="#cbd5e1" roughness={0.7} metalness={0.05} />
                <Edges scale={1.001} color="#0f172a" />
              </mesh>
            ) : null}

            {dividerCountX > 0 || dividerCountZ > 0 ? (
              <group>
                {dividerCountX > 0
                  ? Array.from({ length: dividerCountX }).map((_, idx) => {
                      const step = innerW / dividerCompX
                      const x = -innerW / 2 + (idx + 1) * step
                      return (
                        <mesh key={`divider-x-fallback-${idx}`} position={[x, t + wallH / 2, 0]}>
                          <boxGeometry args={[t, wallH, innerD]} />
                          <meshStandardMaterial color="#9aa4b2" roughness={0.85} metalness={0.05} side={THREE.DoubleSide} />
                          <Edges scale={1.001} color="#0f172a" />
                        </mesh>
                      )
                    })
                  : null}
                {dividerCountZ > 0
                  ? Array.from({ length: dividerCountZ }).map((_, idx) => {
                      const step = innerD / dividerCompZ
                      const z = -innerD / 2 + (idx + 1) * step
                      return (
                        <mesh key={`divider-z-fallback-${idx}`} position={[0, t + wallH / 2, z]}>
                          <boxGeometry args={[innerW, wallH, t]} />
                          <meshStandardMaterial color="#9aa4b2" roughness={0.85} metalness={0.05} side={THREE.DoubleSide} />
                          <Edges scale={1.001} color="#0f172a" />
                        </mesh>
                      )
                    })
                  : null}
              </group>
            ) : null}
          </group>
        )}

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -HB / 2 - t * 1.5, 0]}>
          <planeGeometry args={[W * 3, D * 3]} />
          <meshStandardMaterial color="#0b1220" roughness={1} metalness={0} />
        </mesh>

        <OrbitControls enableDamping target={[0, 0, 0]} />

        <Html position={[0, H / 2 + t * 2, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="rounded bg-black/40 px-2 py-1 text-[11px] text-slate-100">
            {Math.round(outerWidth)} × {Math.round(outerDepth)} × {Math.round(outerHeight)} mm
          </div>
        </Html>
      </Canvas>
    </div>
  )
}
